import {
  Card,
  Stack,
  Text,
  Button,
  Icon,
  HorizontalStack,
  TextField,
  Select,
  ProgressBar,
} from '@shopify/polaris';
import { SearchMinor, StarFilledMinor } from '@shopify/polaris-icons';
import { useRef } from 'react';

export default function ReviewHeader({
  searchTerm,
  handleSearchChange,
  totalReviews = 0,
  avgRating = 4.7,
  starCounts = [0, 0, 0, 0, 0],
  publishedStatus,
  setPublishedStatus,
  ratingFilter,
  setRatingFilter,
}) {
  const downloadRef = useRef(null);

  const handleExportClick = () => {
    if (downloadRef.current) downloadRef.current.click();
  };

  const total = starCounts.reduce((sum, count) => sum + count, 0);
  const percentages = starCounts.map((count) =>
    total === 0 ? 0 : Math.round((count / total) * 100)
  );

  return (
    <Card.Section>
      <Stack vertical spacing="tight">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32 }}>
          {/* Left: Rating Summary */}
          <div style={{ minWidth: 160, textAlign: 'center' }}>
            <Text variant="headingXl">{avgRating.toFixed(1)}</Text>
            <Text as="p" fontWeight="medium" color="subdued" size="medium">
              {totalReviews.toLocaleString()} Reviews
            </Text>
            <HorizontalStack gap="extraTight">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} source={StarFilledMinor} color="warning" />
              ))}
            </HorizontalStack>
            <Button plain onClick={handleExportClick} size="slim">
              Export to .csv
            </Button>
            <a
              ref={downloadRef}
              href="/api/admin/export-reviews"
              download="published-reviews.csv"
              style={{ display: 'none' }}
            />
          </div>

          {/* Right: Rating Breakdown Bars */}
          <div style={{ flexGrow: 1 }}>
            <Stack vertical spacing="extraTight">
              {Array.from({ length: 5 }).map((_, i) => {
                const rating = 5 - i;
                return (
                  <div
                    key={rating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '13px',
                    }}
                  >
                    <Text size="medium">{rating} ★</Text>
                    <ProgressBar
                      progress={percentages[rating - 1]}
                      color="success"
                      size="small"
                    />
                    <Text size="medium" alignment="right" style={{ width: 32 }}>
                      {percentages[rating - 1]}%
                    </Text>
                  </div>
                );
              })}
            </Stack>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          <TextField
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by name, email or product"
            prefix={<Icon source={SearchMinor} color="base" />}
            clearButton
            onClearButtonClick={() => handleSearchChange('')}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            label=""
            value={publishedStatus}
            onChange={setPublishedStatus}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Published Only', value: 'published' },
              { label: 'Unpublished Only', value: 'pending' },
            ]}
          />
          <Select
            label=""
            value={ratingFilter}
            onChange={setRatingFilter}
            options={[
              { label: 'Any rating', value: 'any' },
              { label: '5 Stars', value: '5' },
              { label: '4 Stars', value: '4' },
              { label: '3 Stars', value: '3' },
              { label: '2 Stars', value: '2' },
              { label: '1 Star', value: '1' },
            ]}
          />
        </div>
      </Stack>
    </Card.Section>
  );
}
