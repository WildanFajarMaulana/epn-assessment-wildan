import { Form, useLoaderData, useNavigation } from "react-router";
import axios from "axios";

export function meta() {
  return [{ title: "5 API Paralel - HR App" }];
}

interface ApiResult {
  name: string;
  url: string;
  count: number;
  durationMs: number;
  sampleTitle: string;
  error?: string;
}

const ENDPOINTS = [
  { name: "Posts", url: "https://jsonplaceholder.typicode.com/posts" },
  { name: "Comments", url: "https://jsonplaceholder.typicode.com/comments" },
  { name: "Albums", url: "https://jsonplaceholder.typicode.com/albums" },
  { name: "Photos (5000 rows)", url: "https://jsonplaceholder.typicode.com/photos" },
  { name: "Todos", url: "https://jsonplaceholder.typicode.com/todos" },
];

async function fetchSingleApi(endpoint: {
  name: string;
  url: string;
}): Promise<ApiResult> {
  const start = performance.now();
  try {
    const res = await axios.get<Array<Record<string, unknown>>>(endpoint.url, {
      timeout: 10000,
    });
    const items = res.data;
    const first = items[0] ?? {};
    return {
      name: endpoint.name,
      url: endpoint.url,
      count: items.length,
      durationMs: Math.round(performance.now() - start),
      sampleTitle: String(first.title || first.name || first.body || "-"),
    };
  } catch (err) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      count: 0,
      durationMs: Math.round(performance.now() - start),
      sampleTitle: "-",
      error: err instanceof Error ? err.message : "Gagal fetch",
    };
  }
}

export async function loader() {
  const totalStart = performance.now();
  const results = await Promise.all(ENDPOINTS.map(fetchSingleApi));

  const totalParallelMs = Math.round(performance.now() - totalStart);
  const sumSequentialMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const totalRecords = results.reduce((sum, r) => sum + r.count, 0);

  return {
    results,
    totalParallelMs,
    sumSequentialMs,
    totalRecords,
  };
}

export default function ParallelApiPage() {
  const {
    results,
    totalParallelMs,
    sumSequentialMs,
    totalRecords,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isReloading = navigation.state === "loading";

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Parallel Fetch 5 API (Server-Side)</h2>
        </div>

        <Form method="get">
          <button type="submit" disabled={isReloading}>
            {isReloading ? "Fetching..." : "Fetch Ulang"}
          </button>
        </Form>
      </div>

      <div className="box">
        Total Durasi Paralel: <strong>{totalParallelMs} ms</strong> | API Terlama:
        {sumSequentialMs} ms | Total Data:
        <strong>{totalRecords.toLocaleString("id-ID")} rows</strong>
      </div>

      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Jumlah Data</th>
            <th>Durasi</th>
            <th>Contoh Data 1</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.name}>
              <td>
                <strong>{item.name}</strong>
                <div className="muted">{item.url}</div>
              </td>
              <td>{item.count.toLocaleString("id-ID")}</td>
              <td>{item.durationMs} ms</td>
              <td>
                {item.error ? (
                  <span className="err">{item.error}</span>
                ) : (
                  item.sampleTitle.slice(0, 60)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
