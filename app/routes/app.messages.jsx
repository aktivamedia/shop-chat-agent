import { Page, DataTable } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return { messages };
};

export default function Messages() {
  const { messages } = useLoaderData();
  const rows = messages.map((m) => [
    m.sessionId,
    m.userId,
    m.inputMessage,
    m.response,
    new Date(m.createdAt).toLocaleString(),
  ]);

  return (
    <Page title="Messages">
      <DataTable
        columnContentTypes={["text", "text", "text", "text", "text"]}
        headings={["Session", "User", "Input", "Response", "Created"]}
        rows={rows}
      />
    </Page>
  );
}
