import { useThreadsContext } from "@/components/agent-inbox/contexts/ThreadContext";
import { InboxItem } from "./components/inbox-item";
import React from "react";
import { useQueryParams } from "./hooks/use-query-params";
import { LIMIT_PARAM, OFFSET_PARAM } from "./constants";
import { Pagination } from "./components/pagination";
import { Inbox as InboxIcon, LoaderCircle, RefreshCcw } from "lucide-react";
import { BackfillBanner } from "./components/backfill-banner";
import { forceInboxBackfill } from "./utils/backfill";
import { logger } from "./utils/logger";

interface AgentInboxViewProps<
  _ThreadValues extends Record<string, any> = Record<string, any>,
> {
  saveScrollPosition: (element?: HTMLElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

function AgentInboxViewInner<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ saveScrollPosition, containerRef }: AgentInboxViewProps<ThreadValues>) {
  const { searchParams, updateQueryParams, getSearchParam } = useQueryParams();
  const { loading, threadData, agentInboxes, refreshThreadList, loading: isThreadListLoading } =
    useThreadsContext<ThreadValues>();
  const scrollableContentRef = React.useRef<HTMLDivElement>(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = React.useState(false);

  // Check if we've already attempted a refresh for this session
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionId = new Date().toDateString();
      const hasRefreshed = localStorage.getItem(`inbox-refreshed-${sessionId}`);
      setHasAttemptedRefresh(hasRefreshed === "true");
    }
  }, []);

  // Auto-refresh inbox IDs once when no threads are found
  React.useEffect(() => {
    const autoRefreshInboxes = async () => {
      if (typeof window === "undefined") return;

      const sessionId = new Date().toDateString();
      const hasRefreshed = localStorage.getItem(`inbox-refreshed-${sessionId}`);

      if (hasRefreshed === "true") return;

      if (
        !loading &&
        !hasAttemptedRefresh &&
        threadData.length === 0 &&
        agentInboxes.length > 0
      ) {
        // Mark that we've attempted a refresh for this session
        localStorage.setItem(`inbox-refreshed-${sessionId}`, "true");
        setHasAttemptedRefresh(true);

        logger.log("Automatically refreshing inbox IDs...");
        await forceInboxBackfill();

        // Add a small delay before reloading to allow state to settle
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    autoRefreshInboxes();
  }, [loading, threadData, agentInboxes, hasAttemptedRefresh]);

  // Register scroll event listener to automatically save scroll position whenever user scrolls
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Define the scroll handler that will save the current scroll position
    const handleScroll = () => {
      // Find the element that's actually scrolling
      if (
        scrollableContentRef.current &&
        scrollableContentRef.current.scrollTop > 0
      ) {
        // First check the inner container (thread list)
        saveScrollPosition(scrollableContentRef.current);
      } else if (containerRef.current && containerRef.current.scrollTop > 0) {
        // Then check the outer container
        saveScrollPosition(containerRef.current);
      } else if (window.scrollY > 0) {
        // Finally check the window
        saveScrollPosition();
      }
    };

    // We need to throttle the handler to avoid performance issues
    let timeout: NodeJS.Timeout | null = null;
    const throttledScrollHandler = () => {
      if (!timeout) {
        timeout = setTimeout(() => {
          handleScroll();
          timeout = null;
        }, 300); // Only call every 300ms
      }
    };

    // Add the event listener
    window.addEventListener("scroll", throttledScrollHandler, {
      passive: true,
    });

    // Don't forget to clean up
    return () => {
      window.removeEventListener("scroll", throttledScrollHandler);
      if (timeout) clearTimeout(timeout);
    };
  }, [containerRef, saveScrollPosition]);

  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const offsetQueryParam = getSearchParam(OFFSET_PARAM);
      const limitQueryParam = getSearchParam(LIMIT_PARAM);
      if (!offsetQueryParam) {
        updateQueryParams(OFFSET_PARAM, "0");
      }
      if (!limitQueryParam) {
        updateQueryParams(LIMIT_PARAM, "10");
      }
    } catch (e) {
      logger.error("Error updating query params", e);
    }
  }, [searchParams]);

  // フィルタせず全件表示
  const threadDataToRender = React.useMemo(() => threadData, [threadData]);
  const noThreadsFound = !threadDataToRender.length;

  // Correct way to save scroll position before navigation
  const handleThreadClick = () => {
    // First try the inner scrollable div
    if (
      scrollableContentRef.current &&
      scrollableContentRef.current.scrollTop > 0
    ) {
      saveScrollPosition(scrollableContentRef.current);
    }
    // Then try the outer container
    else if (containerRef.current && containerRef.current.scrollTop > 0) {
      saveScrollPosition(containerRef.current);
    }
    // Finally try window
    else if (window.scrollY > 0) {
      saveScrollPosition();
    }
    // If none have scroll, find scrollable elements as fallback
    else {
      const scrollableElements = document.querySelectorAll(
        '[class*="overflow"]'
      );
      scrollableElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollTop > 0) {
          saveScrollPosition(htmlEl);
          return;
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto w-full">
      <div className="pl-5 pt-4 pb-2 border-b bg-white sticky top-0 z-10 rounded-none">
        <h2 className="text-lg font-semibold tracking-tight">問い合わせ</h2>
      </div>
      <div className="pl-5 pt-4 flex items-center justify-between">
        <BackfillBanner />
        <button
          onClick={async () => {
            if (refreshThreadList) {
              await refreshThreadList();
            }
          }}
          disabled={isThreadListLoading}
          className="ml-2 p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-black transition-colors"
          aria-label="Reload thread list"
        >
          {isThreadListLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCcw className="h-5 w-5" />
          )}
        </button>
      </div>
      <div
        ref={scrollableContentRef}
        className="flex flex-col items-start w-full max-h-fit h-full border-y-[1px] border-gray-50 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-3"
      >
        {threadDataToRender.map((threadData, idx) => {
          return (
            <InboxItem<ThreadValues>
              key={`inbox-item-${threadData.thread.thread_id}`}
              threadData={threadData}
              isLast={idx === threadDataToRender.length - 1}
              onThreadClick={handleThreadClick}
            />
          );
        })}
        {noThreadsFound && !loading && (
          <div className="w-full flex items-center justify-center p-4 flex-col">
            <div className="flex gap-2 items-center justify-center text-gray-700 mb-4">
              <InboxIcon className="w-6 h-6" />
              <p className="font-medium">No threads found</p>
            </div>
          </div>
        )}
        {noThreadsFound && loading && (
          <div className="w-full flex items-center justify-center p-4">
            <div className="flex gap-2 items-center justify-center text-gray-700">
              <p className="font-medium">Loading</p>
              <LoaderCircle className="w-6 h-6 animate-spin" />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-start w-full p-5">
        <Pagination />
      </div>
    </div>
  );
}

// HACK: Weird way to type this component but it works for now
export const AgentInboxView = React.forwardRef<
  HTMLDivElement,
  AgentInboxViewProps<Record<string, any>> // Explicitly type props here
>(function AgentInboxView(props, ref) { // Added function name for displayName
  // Use an internal ref if no external ref is provided
  const internalRef = React.useRef<HTMLDivElement>(null);
  // Ensure containerRef is correctly typed for AgentInboxViewInner
  const containerRef = (ref || internalRef) as React.RefObject<HTMLDivElement>;

  return (
    // <div ref={containerRef} className="min-w-[1000px] h-full overflow-y-auto">
    // ↑ min-w-[1000px] がレイアウト崩れの原因の可能性があるため、一時的に削除して確認
    // Pass containerRef to AgentInboxViewInner
    <AgentInboxViewInner {...props} containerRef={containerRef} />
  );
});

AgentInboxView.displayName = "AgentInboxView"; // Set displayName
