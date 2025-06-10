import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Link,
} from "@shopify/polaris";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Loader: Fetch all messages for the provided sessionId
export const loader = async ({ params, request }) => {
  await authenticate.admin(request);
  const { sessionId } = params;

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  if (!messages || messages.length === 0) {
    throw new Response("Not Found", { status: 404 });
  }

  return { sessionId, messages };
};

export default function SessionDetail() {
  const { sessionId, messages } = useLoaderData();

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          {/* Main content section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {/* Navigation / header */}
                <InlineStack align="space-between">
                  <RemixLink to="/app/sessions" style={{ textDecoration: "none" }}>
                    <Text variant="bodyMd" as="span">
                      ← Back to sessions
                    </Text>
                  </RemixLink>
                  <Badge status="info">{messages.length} messages</Badge>
                </InlineStack>

                {/* Session ID and info */}
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Session – <span style={{ wordBreak: "break-all" }}>{sessionId}</span>
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Conversation log for this chat agent session.
                  </Text>
                </BlockStack>

                {/* Conversation */}
                <BlockStack gap="300">
                  {messages.map((msg) => {
                    const ts = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleString()
                      : "Unknown time";
                    return (
                      <Card sectioned key={msg.id} style={{ background: "#f9fafb" }}>
                        <BlockStack gap="100">
                          <InlineStack align="space-between">
                            <Text variant="bodyMd" as="span">
                              <strong>User:</strong> {msg.input_message}
                            </Text>
                            <Text variant="caption" as="span" aria-label="Message timestamp">
                              {ts}
                            </Text>
                          </InlineStack>
                          <InlineStack align="space-between" style={{ marginTop: 8 }}>
                            <Text variant="bodyMd" as="span">
                              <strong>Agent:</strong> {msg.response}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    );
                  })}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Side info section, just like the main Sessions page */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Session details
                  </Text>
                  <Text variant="bodyMd" as="p">
                    You are viewing all user & agent messages for this chat session.
                  </Text>
                  <Text variant="bodySm" as="span">
                    Use the “Back to sessions” link to view more sessions.
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Accessibility
                  </Text>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodyMd">
                      • Timestamps for each message.
                    </Text>
                    <Text as="span" variant="bodyMd">
                      • Message roles (User/Agent) are labeled.
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
