import {
  Page,
  Layout,
  Card,
  Stack,
  Text,
  Button,
  DropZone,
  Thumbnail,
  Banner,
  Select,
  Spinner,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';

export default function ImportReviewsPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [validationIssues, setValidationIssues] = useState([]);
  const [validCount, setValidCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []))
      .catch((err) => console.error('Error fetching products:', err));
  }, []);

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/api/admin/download-review-template';
    link.download = 'reviews-import.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateFile = async () => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/validate-uploaded-csv', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  };

  const handleUpload = async () => {
    if (!file || !selectedProductId) {
      setError('Please select a product and upload a file.');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setValidationIssues([]);
    setValidCount(0);
    setTotalCount(0);

    const validation = await validateFile();
    const validRows = validation.validRows || [];
    const issues = validation.issues || [];

    setValidCount(validRows.length);
    setTotalCount(validRows.length + issues.length);

    if (!validRows.length) {
      setValidationIssues(issues);
      setUploading(false);
      return;
    }

    const selectedProduct = products.find((p) => p.id === Number(selectedProductId));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('product_id', selectedProductId);
    formData.append('product_handle', selectedProduct?.handle || '');
    formData.append('validated_data', JSON.stringify(validRows));
    formData.append('issue_count', issues.length.toString()); // ✅ Add this
    formData.append('validation_issues', JSON.stringify(validation.issues || []));


    try {
      const res = await fetch('/api/admin/upload-reviews', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setUploadSuccess(true);
        setFile(null);
        setError('');
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (issues.length > 0) {
        setValidationIssues(issues);
      }
    }
  };

  return (
    <Page title="Import Reviews">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <Text variant="headingMd">Upload Your Review File</Text>
              <Text>
                Download the CSV template, enter your reviews, and then upload it here after selecting the correct product.
              </Text>
              <Stack spacing="tight">
                <Button
                  url="https://docs.google.com/spreadsheets/d/1nl4d7o2qdMwUdMqkTsr-thUV4GQkY6jmKaPeDCVzr0s/copy"
                  external
                >
                  Open Google Sheet
                </Button>
                <Button onClick={downloadTemplate} plain>
                  Download CSV Template
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned title="Upload Completed File">
            <Stack vertical spacing="loose">
              {products.length === 0 ? (
                <Spinner accessibilityLabel="Loading products" size="small" />
              ) : (
                <Select
                  label="Select Product"
                  options={products.map((p) => ({ label: p.handle, value: p.id }))}
                  onChange={setSelectedProductId}
                  value={selectedProductId}
                  placeholder="Choose a product"
                />
              )}

              <DropZone
                accept=".csv"
                type="file"
                onDrop={(_, acceptedFiles) => setFile(acceptedFiles[0])}
              >
                {file ? (
                  <Thumbnail
                    size="small"
                    alt={file.name}
                    source="https://cdn-icons-png.flaticon.com/512/337/337946.png"
                  />
                ) : (
                  <DropZone.FileUpload actionTitle="Upload Your CSV File Here" />
                )}
              </DropZone>

              {file && (
                <Button onClick={handleUpload} loading={uploading} primary>
                  Upload Now
                </Button>
              )}

              {error && <Banner status="critical">{error}</Banner>}

              {uploadSuccess && (
                <Banner status="success">
                  ✅ {validCount} review{validCount > 1 ? 's' : ''} imported successfully.
                  {validationIssues.length > 0 && (
                    <>
                      <br />⚠️ {validationIssues.length} row{validationIssues.length > 1 ? 's were' : ' was'} skipped due to validation issues.
                    </>
                  )}
                </Banner>
              )}

              {validationIssues.length > 0 && (
                <Banner status="critical" title="Validation Issues Found">
                  <ul>
                    {validationIssues.map((issue, idx) => (
                      <li key={idx}>
                        <b>Row:</b> {JSON.stringify(issue.row)} <br />
                        {Object.entries(issue.errors).map(([key, val]) => (
                          <div key={key}>
                            <b>{key}</b>: {val}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </Banner>
              )}
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
