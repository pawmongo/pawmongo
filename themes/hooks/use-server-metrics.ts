"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
export function useServerMetrics(enabled = true) {
  const [metrics, setMetrics] = useState<any>(null);
  const [samples, setSamples] = useState<
    Array<{ ops: number; network: number }>
  >([]);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      previous: any = null;
    const poll = async () => {
      try {
        const current = await apiClient.getServerMonitoring();
        if (stopped) return;
        const seconds = previous
          ? (current.sampledAt - previous.sampledAt) / 1000
          : 0;
        const delta = (key: string) =>
          seconds > 0 && current.opcounters && previous?.opcounters
            ? Math.max(
                0,
                (current.opcounters[key] - previous.opcounters[key]) / seconds,
              )
            : null;
        current.rates = {
          query: delta("query"),
          insert: delta("insert"),
          update: delta("update"),
          ops:
            seconds > 0 && current.opcounters && previous?.opcounters
              ? Object.keys(current.opcounters).reduce(
                  (sum, key) => sum + (delta(key) || 0),
                  0,
                )
              : null,
          in:
            seconds > 0 && current.network && previous?.network
              ? Math.max(
                  0,
                  (current.network.bytesIn - previous.network.bytesIn) /
                    seconds,
                )
              : null,
          out:
            seconds > 0 && current.network && previous?.network
              ? Math.max(
                  0,
                  (current.network.bytesOut - previous.network.bytesOut) /
                    seconds,
                )
              : null,
        };
        setMetrics(current);
        if (current.rates.ops !== null)
          setSamples((s) =>
            [
              ...s,
              {
                ops: current.rates.ops,
                network: current.rates.in + current.rates.out,
              },
            ].slice(-24),
          );
        previous = current;
      } catch {
        if (!stopped) setMetrics(null);
      }
      if (!stopped) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [enabled]);
  const number = (value: number | null | undefined) =>
    value == null ? "—" : Math.round(value).toLocaleString();
  const mb = (value: number | null | undefined) =>
    value == null ? "—" : (value / 1048576).toFixed(1);
  return { metrics, samples, number, mb };
}
