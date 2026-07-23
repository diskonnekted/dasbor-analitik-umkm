// src/lib/kmeans.ts
// Implementasi K-Means sederhana (k=2-5) di sisi klien.

export interface KMeansPoint {
  label: string;
  values: number[];
}

export interface KMeansResult {
  clusters: number[]; // penugasan tiap titik
  centroids: number[][]; // posisi akhir centroid
  iterations: number;
  points: KMeansPoint[];
  k: number;
}

function euclid(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export function kmeans(points: KMeansPoint[], k: number, maxIter = 100): KMeansResult {
  const n = points.length;
  const dim = points[0]?.values.length ?? 0;
  if (n < k) k = Math.max(1, n);

  // inisialisasi centroid: sebar titik berdasarkan nilai pertama (lebih stabil daripada random)
  const sorted = [...points].sort((a, b) => a.values[0] - b.values[0]);
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * n) / k);
    centroids.push([...(sorted[idx]?.values ?? points[0].values)]);
  }

  let clusters = new Array(n).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIter) {
    iter++;
    changed = false;
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = euclid(points[i].values, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (clusters[i] !== best) {
        clusters[i] = best;
        changed = true;
      }
      for (let d = 0; d < dim; d++) sums[best][d] += points[i].values[d];
      counts[best]++;
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / counts[c];
      }
    }
  }

  return { clusters, centroids, iterations: iter, points, k };
}

/** Beri label prioritas berdasarkan nilai centroid dimensi-0 (besar = prioritas tinggi). */
export function priorityLabels(result: KMeansResult): { idx: number; label: string; color: string }[] {
  const order = result.centroids
    .map((c, idx) => ({ idx, val: c[0] ?? 0 }))
    .sort((a, b) => b.val - a.val);
  const palette = [
    { label: "Prioritas Tinggi", color: "#DC2626" },
    { label: "Prioritas Menengah", color: "#F59E0B" },
    { label: "Prioritas Rendah", color: "#10B981" },
    { label: "Klaster 4", color: "#2563EB" },
    { label: "Klaster 5", color: "#7C3AED" },
  ];
  return order.map((o, i) => ({ idx: o.idx, ...palette[i] }));
}
