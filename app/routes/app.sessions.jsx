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
  DatePicker,
  TextField,
  Button,
} from "@shopify/polaris";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Converts a YYYY-MM-DD string (local date) into a UTC ISO range
 * covering that entire local day.
 * Handles dynamic timezone using browser info.
 */
function localDateToUtcRange(localDateStr) {
  // Get timezone offset in minutes; negative if behind UTC
  const offsetMinutes = new Date().getTimezoneOffset();
  // Start and end of local day in local time
  const localStart = new Date(`${localDateStr}T00:00:00`);
  const localEnd = new Date(`${localDateStr}T23:59:59.999`);
  // Adjust to UTC by adding offset
  const startUtc = new Date(localStart.getTime() - offsetMinutes * 60000);
  const endUtc = new Date(localEnd.getTime() - offsetMinutes * 60000);
  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
  };
}

// Loader for sessions page
export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  // Find all messages that match query and date range
  const messageFilter = {
    ...(q && {
      OR: [
        { inputMessage: { contains: q, mode: "insensitive" } },
        { response: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
  };

  // Find unique sessions from those messages
  const sessions = await prisma.message.groupBy({
    by: ["sessionId"],
    _max: { createdAt: true },
    where: Object.keys(messageFilter).length > 0 ? messageFilter : undefined,
    orderBy: { _max: { createdAt: "desc" } },
    take: 50,
  });

  // For each session, get the first message for preview
  const sessionsWithFirstMsg = await Promise.all(
    sessions.map(async (session) => {
      const firstMsg = await prisma.message.findFirst({
        where: { sessionId: session.sessionId },
        orderBy: { createdAt: "asc" },
        select: { inputMessage: true },
      });
      return {
        ...session,
        firstInput: firstMsg?.inputMessage || "(No message)",
      };
    }),
  );

  return { sessions: sessionsWithFirstMsg ?? [] };
};

export default function Sessions() {
  const { sessions } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryValue, setQueryValue] = useState(searchParams.get("q") || "");
  // Store local date for UI fields
  const [startDate, setStartDate] = useState(
    searchParams.get("localStartDate") || "",
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("localEndDate") || "",
  );

  // Handle local date input, convert to UTC range for backend query params
  function handleStartDateChange(val) {
    setStartDate(val);

    const params = getParams();
    if (!val) {
      delete params.startDate;
      delete params.localStartDate;
      setSearchParams(params);
      return;
    }
    const { startUtc } = localDateToUtcRange(val);
    params.startDate = startUtc;
    params.localStartDate = val;
    setSearchParams(params);
  }
  function handleEndDateChange(val) {
    setEndDate(val);

    const params = getParams();
    if (!val) {
      delete params.endDate;
      delete params.localEndDate;
      setSearchParams(params);
      return;
    }
    const { endUtc } = localDateToUtcRange(val);
    params.endDate = endUtc;
    params.localEndDate = val;
    setSearchParams(params);
  }
  function handleQueryChange(val) {
    setQueryValue(val);
    setSearchParams({ ...getParams(), q: val });
  }
  function handleClearAll() {
    setQueryValue("");
    setStartDate("");
    setEndDate("");
    setSearchParams({});
  }
  function getParams() {
    const params = {};
    if (queryValue) params.q = queryValue;
    if (startDate) params.localStartDate = startDate;
    if (endDate) params.localEndDate = endDate;
    // Also preserve UTC values if needed
    if (startDate) params.startDate = localDateToUtcRange(startDate).startUtc;
    if (endDate) params.endDate = localDateToUtcRange(endDate).endUtc;
    return params;
  }

  // Applied filter labels for UI
  const appliedFilters = [];
  if (startDate) {
    appliedFilters.push({
      key: "startDate",
      label: `Start: ${startDate}`,
      onRemove: () => handleStartDateChange(""),
    });
  }
  if (endDate) {
    appliedFilters.push({
      key: "endDate",
      label: `End: ${endDate}`,
      onRemove: () => handleEndDateChange(""),
    });
  }

  // Polaris Filters config
  const filters = [
    {
      key: "startDate",
      label: "Start date",
      filter: (
        <TextField
          label="Start date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
    {
      key: "endDate",
      label: "End date",
      filter: (
        <TextField
          label="End date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
  ];

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          {/* Main content */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {/* Header */}
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Session History
                  </Text>
                  <Text variant="bodyMd" as="p">
                    View the latest chat agent sessions. Filter by message text
                    or date.
                  </Text>
                </BlockStack>
                {/* Filters */}
                <Filters
                  queryValue={queryValue}
                  onQueryChange={handleQueryChange}
                  onQueryClear={() => handleQueryChange("")}
                  filters={filters}
                  appliedFilters={appliedFilters}
                  onClearAll={handleClearAll}
                />
                {/* Sessions List */}
                <ResourceList
                  resourceName={{ singular: "session", plural: "sessions" }}
                  items={sessions}
                  renderItem={({ sessionId, _max, firstInput }) => {
                    const last = new Date(_max.createdAt).toLocaleString();
                    return (
                      <ResourceItem
                        id={sessionId}
                        url={`/app/session/${sessionId}`}
                        accessibilityLabel={`View conversation for ${sessionId}`}
                      >
                        <InlineStack
                          align="space-between"
                          wrap={false}
                          gap="tight"
                        >
                          <Text variant="bodyMd" as="span" title={firstInput}>
                            {firstInput
                              ? firstInput.length > 60
                                ? firstInput.slice(0, 60) + "…"
                                : firstInput
                              : "(No message)"}
                          </Text>
                          <Badge
                            status="new"
                            aria-label={`Last message on ${last}`}
                          >
                            {last}
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
                          Try searching for another message or date range.
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
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Tips
                  </Text>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodyMd">
                      • Use the search box to filter by keywords in the
                      conversation thread.
                    </Text>
                    <Text as="span" variant="bodyMd">
                      • Add filters to narrow down by date range.
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
