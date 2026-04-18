"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        An unexpected error occurred. You can try again or navigate to another
        page.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
