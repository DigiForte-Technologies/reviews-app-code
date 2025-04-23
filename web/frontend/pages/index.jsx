import {
  Page,
  Layout,
  Card,
  Spinner,
  Stack,
  Button,
  Checkbox,
  Pagination,
  Popover,
  ActionList,
} from '@shopify/polaris';
import { useEffect, useState, useRef } from 'react';
import { ButtonGroup } from '@shopify/polaris';


import ReviewHeader from '../components/reviews/ReviewHeader';
import ReviewCard from '../components/reviews/ReviewCard';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [popoverActive, setPopoverActive] = useState(false);
  const [publishedStatus, setPublishedStatus] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('any');

  const REVIEWS_PER_PAGE = 20;

  useEffect(() => {
    fetch('/api/admin/reviews')
      .then(res => res.json())
      .then(data => {
        setReviews(data.reviews || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching reviews:', err);
        setLoading(false);
      });
  }, [uploadSuccess]);

  useEffect(() => {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
      })
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  useEffect(() => {
    const newFiltered = filterReviews(reviews, searchTerm, ratingFilter, publishedStatus);
    setFilteredReviews(newFiltered);
    setCurrentPage(1);
  }, [searchTerm, ratingFilter, publishedStatus, reviews]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const filterReviews = (reviewsList, search, rating, status) => {
    let filtered = [...reviewsList];
    if (search) {
      const lowered = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.reviewer_name?.toLowerCase().includes(lowered) ||
        r.review_text?.toLowerCase().includes(lowered) ||
        r.product_handle?.toLowerCase().includes(lowered)
      );
    }
    if (rating !== 'any') {
      filtered = filtered.filter(r => r.rating === parseInt(rating));
    }
    if (status === 'published') {
      filtered = filtered.filter(r => r.published === true);
    } else if (status === 'pending') {
      filtered = filtered.filter(r => r.published === false);
    }
    return filtered;
  };

  const handleTogglePublish = async (id) => {
    const review = reviews.find(r => r.id === id);
    const newStatus = !review.published;
  
    try {
      await fetch('/api/admin/toggle-review-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newStatus }),
      }); 
  
      // Update local state only if backend succeeded
      setReviews(prev => prev.map(r => r.id === id ? { ...r, published: newStatus } : r));
    } catch (err) {
      console.error('❌ Failed to update publish status:', err);
    }
  };
  
  const bulkUpdate = async (ids, published) => {
    await fetch('/api/admin/bulk-update-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, published }),
    });
    setReviews(prev => prev.map(r => ids.includes(r.id) ? { ...r, published } : r));
  };

  const publishAll = () => bulkUpdate(reviews.map(r => r.id), true);
  const unpublishAll = () => bulkUpdate(reviews.map(r => r.id), false);
  const publishSelected = () => bulkUpdate(selectedIds, true);
  const unpublishSelected = () => bulkUpdate(selectedIds, false);
  const toggleSelectAll = () => {
    const pageReviews = currentReviews.map(r => r.id);
    if (selectedIds.length === currentReviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pageReviews);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
    : 0;

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    const i = Math.floor(r.rating) - 1;
    if (i >= 0 && i <= 4) starCounts[i]++;
  });

  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);
  const currentReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  return (
    <Page fullWidth title="Manage Reviews">
      <Layout>
        <Layout.Section>
          <Card>
            <ReviewHeader
              searchTerm={searchTerm}
              handleSearchChange={handleSearchChange}
              totalReviews={reviews.length}
              avgRating={avgRating}
              starCounts={starCounts}
              publishedStatus={publishedStatus}
              setPublishedStatus={setPublishedStatus}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
            />
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card.Section>
              <Popover
                active={popoverActive}
                activator={<Button onClick={() => setPopoverActive(true)}>Bulk Actions</Button>}
                onClose={() => setPopoverActive(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Publish All',
                      onAction: () => {
                        publishAll();
                        setPopoverActive(false);
                      },
                    },
                    {
                      content: 'Unpublish All',
                      onAction: () => {
                        unpublishAll();
                        setPopoverActive(false);
                      },
                    },
                    {
                      content: 'Publish Selected',
                      disabled: selectedIds.length === 0,
                      onAction: () => {
                        publishSelected();
                        setPopoverActive(false);
                      },
                    },
                    {
                      content: 'Unpublish Selected',
                      disabled: selectedIds.length === 0,
                      onAction: () => {
                        unpublishSelected();
                        setPopoverActive(false);
                      },
                    },
                  ]}
                />
              </Popover>
            </Card.Section>

            <Card.Section>
              <Checkbox
                label="Select All"
                checked={selectedIds.length === currentReviews.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < currentReviews.length}
                onChange={toggleSelectAll}
              />
              <Stack vertical spacing="loose">
                {currentReviews.map(review => (
                  <div key={review.id}>
                    <Checkbox
                      checked={selectedIds.includes(review.id)}
                      onChange={(e) => {
                        if (e) {
                          setSelectedIds((prev) => [...prev, review.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== review.id));
                        }
                      }}
                    />
                    <ReviewCard
  review={review}
  onTogglePublish={handleTogglePublish}
  products={products} // ✅ ADD THIS
/>

                  </div>
                ))}
              </Stack>
              {totalPages > 1 && (
  <Stack alignment="center" distribution="center" spacing="tight" style={{ marginTop: 20 }}>
    <Button
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    >
      Previous
    </Button>

    <ButtonGroup segmented>
      {Array.from({ length: totalPages }, (_, i) => (
        <Button
          key={i}
          pressed={currentPage === i + 1}
          onClick={() => setCurrentPage(i + 1)}
        >
          {i + 1}
        </Button>
      ))}
    </ButtonGroup>

    <Button
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
    >
      Next
    </Button>
  </Stack>
)}

            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

