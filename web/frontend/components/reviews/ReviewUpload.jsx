// components/reviews/ReviewUpload.jsx
import {
    Card,
    Select,
    DropZone,
    Thumbnail,
    Button,
    Banner,
    Stack
  } from '@shopify/polaris';
  
  export default function ReviewUpload({
    products,
    selectedProductId,
    setSelectedProductId,
    file,
    setFile,
    handleUpload,
    uploading,
    error,
    uploadSuccess,
  }) {
    return (
      <Card sectioned>
        <Stack vertical spacing="loose">
          <Select
            label="Select Product"
            options={products.map((p) => ({ label: p.handle, value: p.id }))}
            onChange={setSelectedProductId}
            value={selectedProductId}
            placeholder="Select a product"
          />
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
              <DropZone.FileUpload actionTitle="Upload CSV of Reviews" />
            )}
          </DropZone>
          {file && <Button onClick={handleUpload} loading={uploading}>Upload</Button>}
          {error && <Banner status="critical">{error}</Banner>}
          {uploadSuccess && <Banner status="success">Upload Successful!</Banner>}
        </Stack>
      </Card>
    );
  }
  