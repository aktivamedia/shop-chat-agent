import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Link,
  Button,
  FormLayout,
  TextField,
} from "@shopify/polaris";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import ReactMarkdown from "react-markdown";

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
  const createdAt = messages[0]?.createdAt;
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
                  <RemixLink
                    to="/app/sessions"
                    style={{ textDecoration: "none" }}
                  >
                    <Text variant="bodyMd" as="span">
                      ← Back to sessions
                    </Text>
                  </RemixLink>
                  <Badge status="info">{messages.length} messages</Badge>
                </InlineStack>

                {/* Session ID and info */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">
                    Conversation log for this chat agent session.
                  </Text>
                </BlockStack>

                {/* Conversation */}
                <BlockStack gap="300">
                  {messages.map((msg) => {
                    const ts = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString()
                      : "Unknown time";
                    return (
                      <>
                        <Card
                          sectioned
                          key={msg.id}
                          background="bg-surface-emphasis"
                        >
                          <BlockStack gap="100">
                            <InlineStack align="start">
                              <Text variant="bodyMd" as="span">
                                {msg.inputMessage}
                              </Text>
                            </InlineStack>
                          </BlockStack>
                          <BlockStack gap="100">
                            <InlineStack align="end">
                              <Badge status="info">
                                <strong>👤 User</strong> - {ts}
                              </Badge>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                        <Card
                          sectioned
                          key={msg.id}
                          background="bg-surface-info"
                        >
                          <ReactMarkdown
                            components={{
                              img: ({ node, ...props }) => (
                                <img
                                  {...props}
                                  style={{
                                    maxWidth: "150px",
                                    height: "auto",
                                    ...props.style,
                                  }}
                                  alt={props.alt || ""}
                                  aria-label={props.alt || "Chat image"}
                                />
                              ),
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={props.children}
                                >
                                  {props.children}
                                </a>
                              ),
                            }}
                          >
                            {msg.response}
                          </ReactMarkdown>

                          <BlockStack gap="100">
                            <InlineStack align="end">
                              <Badge status="info">
                                <strong>
                                  🤖{" "}
                                  <Link
                                    url={`https://platform.openai.com/logs/${msg.responseId}`}
                                    target="_blank"
                                  >
                                    agent
                                  </Link>
                                </strong>{" "}
                                - {ts}
                              </Badge>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </>
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
                    Session ID:{" "}
                    <span style={{ wordBreak: "break-all" }}>{sessionId}</span>
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Started on:{" "}
                    <span style={{ wordBreak: "break-all" }}>
                      {new Date(createdAt).toLocaleString()}
                    </span>
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Add new FAQ
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Question"
                      onChange={() => {}}
                      autoComplete="off"
                      multiline={2}
                    />
                    <TextField
                      label="Answer"
                      onChange={() => {}}
                      autoComplete="off"
                      multiline={4}
                    />
                    <Button variant="primary" size="large">
                      Save
                    </Button>
                  </FormLayout>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="100">
                    <Button variant="primary" size="large" tone="critical">
                      Delete session
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
