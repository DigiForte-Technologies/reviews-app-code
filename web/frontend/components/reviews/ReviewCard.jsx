// components/reviews/ReviewCard.jsx
import {
  Card,
  Stack,
  Text,
  Icon,
  Button,
  Badge,
  Popover,
  ActionList,
  ButtonGroup,
  Select
} from '@shopify/polaris';
import {
  StarFilledMinor,
  CircleTickMajor,
  HorizontalDotsMinor,
} from '@shopify/polaris-icons';
import { useState } from 'react';

export default function ReviewCard({ review, onTogglePublish, products = [] }) {
  const {
    id,
    reviewer_name,
    product_handle,
    rating,
    review_text,
    image_url,
    created_at,
    published = true,
    featured = false,
    shop_id, // ✅ Include this
  } = review;
  

  const [popoverActive, setPopoverActive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedHandle, setSelectedHandle] = useState(product_handle);
  const [updating, setUpdating] = useState(false);

  const handleUpdateProduct = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/update-review-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: id,
          newProductHandle: selectedHandle,
          shopId: shop_id, // ✅ now defined
        })
        
      });
      console.log('Sending update payload:', {
        reviewId: id,
        newProductHandle: selectedHandle,
        shopId: shop_id
      });
      
      const result = await res.json();
      if (result.success) {
        setEditMode(false);
        location.reload(); // or trigger refresh via props if needed
      }
    } catch (err) {
      console.error('Error updating product handle:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card
      sectioned
      key={id}
      style={{
        borderLeft: `4px solid ${published ? '#27ae60' : '#ccc'}`,
        padding: 24,
        marginBottom: 20,
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* LEFT SECTION */}
        <div style={{ flex: 1 }}>
          <Stack vertical spacing="tight">
            {featured && <Badge tone="info">Featured</Badge>}

            <Text variant="headingMd" fontWeight="bold">
              {reviewer_name}{' '}
              <Text variant="bodyMd" color="subdued">
                about
              </Text>{' '}
              <Text variant="headingSm" tone="interactive">
                {product_handle}
              </Text>
            </Text>

            <Text variant="bodySm" color="subdued">
              Display name: {reviewer_name}
            </Text>

            <Stack spacing="tight" alignment="center">
              {[...Array(rating)].map((_, i) => (
                <Icon key={i} source={StarFilledMinor} color="warning" />
              ))}
              <Text size="bodySm" color="subdued">
                {new Date(created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Icon source={CircleTickMajor} color="success" />
            </Stack>

            <Text variant="bodyMd" as="p">
              {review_text}
            </Text>

            {editMode && (
              <Stack vertical spacing="tight" style={{ marginTop: 12 }}>
                <Select
                  label="Select New Product"
                  options={products.map(p => ({ label: p.handle, value: p.handle }))}
                  onChange={(val) => setSelectedHandle(val)}
                  value={selectedHandle}
                />
                <Button primary loading={updating} onClick={handleUpdateProduct}>Update Product</Button>
                <Button onClick={() => setEditMode(false)} plain>Cancel</Button>
              </Stack>
            )}

            <Stack spacing="tight" wrap={false} style={{ marginTop: 16 }}>
              <Button size="slim" onClick={() => onTogglePublish(id)}>
                {published ? 'Published' : 'Unpublished'}
              </Button>
              <Popover
                active={popoverActive}
                activator={
                  <Button
                    size="slim"
                    icon={HorizontalDotsMinor}
                    onClick={() => setPopoverActive(true)}
                  />
                }
                onClose={() => setPopoverActive(false)}
              >
                <ActionList
                  items={[
                    {
                      content: 'Change product',
                      onAction: () => {
                        setEditMode(true);
                        setPopoverActive(false);
                      }
                    },
                    { content: 'Remove featured tag' },
                    { content: 'Remove verified badge' },
                    { content: 'Add to Carousel' },
                    { content: 'Add to Video Slider' },
                    { content: 'Undo import', destructive: true },
                  ]}
                />
              </Popover>
            </Stack>
          </Stack>
        </div>

        {/* RIGHT IMAGE SECTION */}
        <div style={{ position: 'relative' }}>
          {image_url && (
            <img
              src={image_url}
              alt="Review"
              style={{
                width: 220,
                height: 220,
                objectFit: 'cover',
                borderRadius: 12,
              }}
            />
          )}

        </div>
      </div>
    </Card>
  );
}