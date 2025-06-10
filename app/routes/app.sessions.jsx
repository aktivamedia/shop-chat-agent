import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Filters,
  ResourceList,
  ResourceItem,
  Badge,
  Link,
} from "@shopify/polaris";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Loader for sessions page
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const sessions = await prisma.message.groupBy({
    by: ["sessionId"],
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 50,
  });
  return { sessions: sessions ?? [] };
};

export default function Sessions() {
  const { sessions } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryValue, setQueryValue] = useState(searchParams.get("q") || "");

  // Filtering sessions based on search input
  const filtered = sessions.filter(({ sessionId }) =>
    sessionId.toLowerCase().includes(queryValue.toLowerCase()),
  );

  // Handle search query changes
  const handleQueryChange = (v) => {
    setQueryValue(v);
    setSearchParams({ q: v });
  };

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          {/* Main content section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {/* Header */}
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Session History
                  </Text>
                  <Text variant="bodyMd" as="p">
                    View the latest chat agent sessions on your storefront.
                    Search for sessions by session ID.
                  </Text>
                </BlockStack>
                {/* Filters/Search bar */}
                <Filters
                  queryValue={queryValue}
                  onQueryChange={handleQueryChange}
                  onQueryClear={() => handleQueryChange("")}
                  filters={[]}
                />
                {/* Sessions List */}
                <ResourceList
                  resourceName={{ singular: "session", plural: "sessions" }}
                  items={filtered}
                  renderItem={({ sessionId, _max }) => {
                    const last = new Date(_max.createdAt).toLocaleString();
                    return (
                      <ResourceItem
                        id={sessionId}
                        url={`/app/session/${sessionId}`}
                        accessibilityLabel={`View conversation for ${sessionId}`}
                      >
                        <InlineStack align="baseline" wrap={false} gap="tight">
                          <Text variant="bodyMd" as="span">
                            {sessionId}
                          </Text>
                          <Badge
                            status="new"
                            aria-label={`Last message on ${last}`}
                          >
                            Last: {last}
                          </Badge>
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                  emptyState={
                    <Card>
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h3">
                          No sessions found
                        </Text>
                        <Text variant="bodyMd" as="p">
                          Try searching for another session or check back later.
                        </Text>
                      </BlockStack>
                    </Card>
                  }
                  showHeader
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          {/* Side info section, following Index pattern */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    About sessions
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Each session represents a unique visitor conversation with
                    your storefront chat agent.
                  </Text>
                  <Text variant="bodySm" as="span">
                    For technical details, see&nbsp;
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      GraphQL API
                    </Link>
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Tips
                  </Text>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodyMd">
                      • Use the search box to filter by session ID.
                    </Text>
                    <Text as="span" variant="bodyMd">
                      • Click on a session to view the full conversation.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
