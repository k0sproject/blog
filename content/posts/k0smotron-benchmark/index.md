# How many hosted control planes can one k0smotron management cluster run?

When you use k0smotron, every workload cluster gets a Kubernetes control plane
running as pods in a management cluster. That is the whole appeal: hosted
control planes become ordinary Kubernetes workloads that can be scheduled,
patched, monitored, and deleted with the same tools operators already use.

The tradeoff is that the management cluster becomes the place where the bill is
paid. If you run 10 hosted control planes, the cost is small. If you run 100,
the storage backend, pod limits, watch behavior, and k0smotron reconciliation
all start to matter.

This benchmark started with three practical questions:

1. **Capacity:** how much CPU and memory do we need to run N hosted control
   planes?
2. **Backend behavior:** how do different storage backends perform under
   realistic Kubernetes API load?
3. **k0smotron overhead:** is the operator itself a bottleneck, or are the HCP
   pods and storage backends the real cost?

The short version is:

- k0smotron's operator overhead is small compared with the hosted control
  planes and their storage backends.
- The backend choice matters a lot. It changes where resource usage appears and
  how well watches behave under churn.
- T4 is the most interesting result in this run: embedded and standalone T4 are
  in the same performance band as etcd for the watch-heavy workload.
- SQLite is fine for very small or dependency-free setups, but it collapses
  under write concurrency.
- Embedded NATS accepts some create/list load, but watch delivery falls far
  behind in this configuration.
- PostgreSQL and MySQL now handle the create/list profile cleanly after raising
  connection limits, but watch-heavy churn still exposes database tuning and
  retry behavior.

## Test Environment

The benchmark ran on AWS in a single availability zone to avoid cross-AZ
latency noise.

| role                             | shape                                  |
|----------------------------------|----------------------------------------|
| management control-plane node    | `c5.4xlarge`, 16 vCPU, 32 GiB          |
| management workers               | 3 x `m5.4xlarge`, 16 vCPU, 64 GiB each |
| PostgreSQL node                  | `r6i.xlarge`, io2 data disk            |
| MySQL node                       | `r6i.xlarge`, io2 data disk            |
| MinIO node for T4 object storage | `r6i.large`, io2 data disk             |

The database setup is intentionally conservative. PostgreSQL and MySQL were not
heavily tuned. For the article-grade runs we only raised their connection
limits so the test could reach higher HCP counts and client concurrency:
PostgreSQL and MySQL both use `max_connections=2000`. We did not tune shared
buffers, InnoDB buffer pool size, IO capacity, checkpoint behavior, or query
settings. That matters: the SQL numbers below are closer to "mostly default DB
with enough connections" than to "expertly tuned production database."

The storage variants were:

| storage              | shape                                      |
|----------------------|--------------------------------------------|
| `etcd`               | per-HCP etcd StatefulSet                   |
| `kine-postgres`      | k0s+kine using external PostgreSQL         |
| `kine-mysql`         | k0s+kine using external MySQL              |
| `kine-sqlite`        | k0s+kine using SQLite inside the HCP pod   |
| `kine-nats-embedded` | k0s with embedded NATS storage             |
| `kine-t4`            | k0s+kine with T4 embedded in the HCP pod   |
| `t4-standalone`      | k0s using external T4 through the etcd API |

## What We Counted

A hosted control plane, or HCP, is the pod or set of pods running the Kubernetes
API server and its supporting control-plane components for a workload cluster.
Depending on the backend, storage can live in different places:

- with `etcd`, storage is a separate per-HCP StatefulSet;
- with PostgreSQL and MySQL, storage is an external database pod;
- with SQLite, embedded NATS, and embedded T4, storage is inside the HCP pod;
- with standalone T4, storage is a separate T4 service plus object storage.

For capacity planning, those distinctions matter. The capacity tables split
resources into:

- **HCP:** CPU and memory used by hosted control-plane pods;
- **DB/storage:** CPU and memory used by separate storage pods;
- **total:** HCP plus DB/storage, using sampled peak values from the run.

For embedded backends, DB/storage is shown as zero because the storage process
is already counted in the HCP pod. For standalone T4, the HCP perf tables do
not include object-storage cost; a full production sizing exercise should add
that separately.

## Capacity: What It Costs To Run 10, 50, and 100 HCPs

The scale test creates hosted control planes with parallelism 10 and measures
how long they take to become ready, plus sampled CPU and memory while the
scenario runs.

| storage              | clusters | p50 ready | p99 ready |  HCP mem | DB/storage mem | total mem |     HCP CPU | DB/storage CPU |   total CPU |
|----------------------|---------:|----------:|----------:|---------:|---------------:|----------:|------------:|---------------:|------------:|
| `etcd`               |       10 |     28.6s |     75.1s |  2.0 GiB |        0.4 GiB |   2.4 GiB |   3.2 cores |      0.6 cores |   3.7 cores |
| `etcd`               |       50 |     21.6s |     74.1s |  9.7 GiB |        1.1 GiB |  10.8 GiB |  17.3 cores |      2.8 cores |  20.1 cores |
| `etcd`               |      100 |     22.5s |     80.2s | 19.3 GiB |        1.9 GiB |  21.2 GiB |  36.5 cores |      5.6 cores |  42.1 cores |
| `kine-postgres`      |       10 |     20.1s |     30.1s |  4.0 GiB |        0.8 GiB |   4.8 GiB |  11.1 cores |      2.5 cores |  13.6 cores |
| `kine-mysql`         |       10 |     22.1s |     34.1s |  3.9 GiB |        0.9 GiB |   4.8 GiB |   9.8 cores |      0.7 cores |  10.5 cores |
| `kine-mysql`         |       50 |     16.1s |    466.1s | 20.7 GiB |        1.3 GiB |  21.9 GiB |  52.7 cores |      1.2 cores |  53.9 cores |
| `kine-mysql`         |      100 |     16.1s |     22.1s | 40.7 GiB |        1.3 GiB |  42.0 GiB | 111.5 cores |      1.6 cores | 113.1 cores |
| `kine-sqlite`        |       10 |     20.2s |     22.2s |  3.9 GiB |        0.0 GiB |   3.9 GiB |  14.5 cores |      0.0 cores |  14.5 cores |
| `kine-sqlite`        |       50 |     16.1s |     22.1s | 20.1 GiB |        0.0 GiB |  20.1 GiB |  64.5 cores |      0.0 cores |  64.5 cores |
| `kine-sqlite`        |      100 |     20.0s |     34.1s | 41.2 GiB |        0.0 GiB |  41.2 GiB | 119.2 cores |      0.0 cores | 119.2 cores |
| `kine-nats-embedded` |       10 |     26.2s |     36.1s |  3.9 GiB |        0.0 GiB |   3.9 GiB |  12.0 cores |      0.0 cores |  12.0 cores |
| `kine-nats-embedded` |       50 |     22.0s |     42.1s | 20.2 GiB |        0.0 GiB |  20.2 GiB |  63.9 cores |      0.0 cores |  63.9 cores |
| `kine-nats-embedded` |      100 |     24.2s |     46.2s | 41.7 GiB |        0.0 GiB |  41.7 GiB | 129.2 cores |      0.0 cores | 129.2 cores |
| `kine-t4`            |       10 |     20.3s |     24.3s |  3.4 GiB |        0.0 GiB |   3.4 GiB |   7.0 cores |      0.0 cores |   7.0 cores |
| `kine-t4`            |       50 |     16.1s |     26.1s | 18.7 GiB |        0.0 GiB |  18.7 GiB |  39.2 cores |      0.0 cores |  39.2 cores |
| `kine-t4`            |      100 |     20.1s |     32.1s | 40.7 GiB |        0.0 GiB |  40.7 GiB |  98.5 cores |      0.0 cores |  98.5 cores |

There are three useful takeaways here.

First, the cost mostly scales with the number of HCPs. That is good news for
capacity planning: going from 50 to 100 clusters roughly doubles the resource
footprint instead of creating a sudden cliff.

Second, storage placement changes how to read the numbers. etcd looks light in
the HCP column because etcd runs outside the HCP pod. Embedded backends look
heavier in the HCP column because their storage process is counted in the HCP
pod itself. SQL backends move part of the cost into the DB/storage column.

Third, provisioning latency is not simply "more resources means faster." MySQL
provisions 100 HCPs with p50 16.1s and p99 22.1s, but its 50-HCP run has a very
long p99 tail. PostgreSQL is shown for 10 HCPs only in this table because the
larger PostgreSQL scale rows were not valid measurements. T4 has a tight p99
tail, and etcd has the largest p99 readiness tail at 100 clusters.

## Load Shape Matters

A Kubernetes control plane is not just a key/value write benchmark. Controllers
open watches, relist, react to changes, and expect events to arrive in order and
without large delays. For that reason the benchmark uses two API profiles:

| profile       | what it tests                                     |
|---------------|---------------------------------------------------|
| `create-list` | create ConfigMaps, then list them back            |
| `watch-churn` | 25 watches plus create/update/update/delete churn |

`create-list` is a simple throughput and latency test. `watch-churn` is closer
to control-plane reality because it exercises watch delivery while objects are
changing.

The concurrency sweep ran at 50, 200, 500, and 1000 clients. At the low end, it
shows what happens under ordinary pressure. At the high end, it shows where a
backend or HCP setup starts to crack.

## Load Envelope By Profile

The most useful way to read the concurrency sweep is not only "who wins at
c1000?" It is "how much load can I put on this backend before errors or missing
watch events show up?"

The tables below summarize repeated runs for each concurrency level. The SQL
rows use the connection-tuned database setup described earlier. That is still
not deep database tuning; it is only enough tuning to avoid measuring a
connection-limit cliff.

For simple create/list traffic, errors were basically zero for every backend
except SQLite. The useful comparison is therefore throughput and latency. Each
cell below shows average write throughput, average write p99, and average read
p99:

| storage              | c50                                 | c200                                 | c500                                 | c1000                                | practical read                                                  |
|----------------------|-------------------------------------|--------------------------------------|--------------------------------------|--------------------------------------|-----------------------------------------------------------------|
| `etcd`               | 1651 ops/s, w p99 54ms, r p99 30ms  | 1109 ops/s, w p99 305ms, r p99 155ms | 1258 ops/s, w p99 971ms, r p99 903ms | 2881 ops/s, w p99 645ms, r p99 14.7s | Fast write path; c1000 read latency is high.                    |
| `kine-postgres`      | 327 ops/s, w p99 364ms, r p99 675ms | 582 ops/s, w p99 961ms, r p99 2.1s   | 633 ops/s, w p99 2.3s, r p99 6.9s    | 651 ops/s, w p99 4.4s, r p99 14.1s   | Clean but slower than etcd/T4.                                  |
| `kine-mysql`         | 1151 ops/s, w p99 78ms, r p99 477ms | 1853 ops/s, w p99 321ms, r p99 2.3s  | 2015 ops/s, w p99 858ms, r p99 6.2s  | 2005 ops/s, w p99 2.8s, r p99 13.7s  | Strongest SQL write result.                                     |
| `kine-sqlite`        | 11 ops/s, w p99 9.9s, r p99 2.2s    | 12 ops/s, w p99 12.4s, r p99 7.4s    | 13 ops/s, w p99 13.4s, r p99 6.7s    | 14 ops/s, w p99 13.9s, r p99 3.7s    | Write error rate is 32-89%; not suitable for concurrent writes. |
| `kine-nats-embedded` | 376 ops/s, w p99 5.5s, r p99 347ms  | 165 ops/s, w p99 26.4s, r p99 922ms  | 544 ops/s, w p99 1.3s, r p99 15.6s   | 927 ops/s, w p99 2.7s, r p99 15.3s   | Mostly clean, but latency is uneven.                            |
| `kine-t4`            | 1650 ops/s, w p99 56ms, r p99 73ms  | 1092 ops/s, w p99 350ms, r p99 170ms | 1049 ops/s, w p99 2.4s, r p99 447ms  | 2959 ops/s, w p99 605ms, r p99 14.7s | Fast write path; c1000 read latency is high.                    |
| `t4-standalone`      | 1649 ops/s, w p99 57ms, r p99 34ms  | 1103 ops/s, w p99 296ms, r p99 112ms | 1197 ops/s, w p99 1.1s, r p99 435ms  | 2921 ops/s, w p99 779ms, r p99 37.0s | Fast write path; c1000 read result had run-to-run noise.        |

SQLite is the exception to the "errors are basically zero" rule: its average
write error rate is already 31.9% at c50 and climbs to 88.7% at c1000. NATS has
small create/list write error rates at c50 and c200, but the larger issue for
NATS is watch delivery rather than simple create/list. Standalone T4's c1000
read error rate comes from run-to-run fluctuation in this dataset, so the more
useful signal is that its write path stays in the etcd/T4 band.

For watch-heavy controller-style traffic, the useful latency view is p99 watch
lag and watch event rate:

| storage              | c50                  | c200                | c500                | c1000               | practical read                              |
|----------------------|----------------------|---------------------|---------------------|---------------------|---------------------------------------------|
| `etcd`               | lag 81ms, 40.8k/s    | lag 2.7s, 51.7k/s   | lag 3.3s, 55.3k/s   | lag 7.8s, 52.3k/s   | Clean across the tested range.              |
| `kine-postgres`      | lag 323ms, 15.1k/s   | lag 1.8s, 13.4k/s   | lag 4.7s, 13.3k/s   | lag 9.1s, 13.7k/s   | Better after connection tuning.             |
| `kine-mysql`         | lag 772ms, 32.1k/s   | lag 523ms, 34.5k/s  | lag 1.7s, 28.8k/s   | lag 4.4s, 28.3k/s   | Low lag, but write errors grow with load.   |
| `kine-sqlite`        | lag 13.4s, 581/s     | lag 26.5s, 422/s    | lag 27.5s, 363/s    | lag 27.9s, 362/s    | Not a controller-churn backend.             |
| `kine-nats-embedded` | lag 39.4s, 8.4k/s    | lag 22.6s, 7.3k/s   | lag 43.8s, 8.4k/s   | lag 51.5s, 7.1k/s   | Watch lag is the main problem.              |
| `kine-t4`            | lag 103ms, 39.9k/s   | lag 1.7s, 55.3k/s   | lag 4.2s, 55.3k/s   | lag 5.4s, 53.9k/s   | Clean across the tested range.              |
| `t4-standalone`      | lag 83ms, 41.9k/s    | lag 1.3s, 55.3k/s   | lag 5.1s, 54.8k/s   | lag 6.3s, 55.1k/s   | Clean across the tested range.              |

This is the operational answer hiding behind the larger tables: etcd and both
T4 modes are the only backends with near-zero client errors and near-complete
watch delivery through the full tested watch-churn range. PostgreSQL and MySQL
look much better on create/list than on watches: PostgreSQL averages 9-15%
write errors and 89-96% watch delivery across the sweep, while MySQL averages
12-45% write errors and 60-89% watch delivery. NATS and SQLite are not limited
by the same thing: SQLite fails on write concurrency, while NATS accepts more
writes but does not reliably feed watches under churn.

## Create/List: Writes Are Only Half The Story

At concurrency 1000, the single-node `create-list` profile produced these
median results:

| storage              | write throughput | write p99 | read throughput | read p99 |
|----------------------|-----------------:|----------:|----------------:|---------:|
| `etcd`               |       2920 ops/s |    0.673s |       168 ops/s |    15.4s |
| `kine-postgres`      |        644 ops/s |    4.116s |       160 ops/s |    13.4s |
| `kine-mysql`         |       2006 ops/s |    2.115s |       179 ops/s |    14.3s |
| `kine-sqlite`        |         14 ops/s |   13.996s |       731 ops/s |     3.4s |
| `kine-nats-embedded` |        929 ops/s |    2.000s |       153 ops/s |    15.3s |
| `kine-t4`            |       2941 ops/s |    0.601s |       167 ops/s |    14.3s |
| `t4-standalone`      |       2932 ops/s |    0.691s |        46 ops/s |    29.3s |

The write side has a clear top group: etcd, embedded T4, and standalone T4 are
all around 2900 writes/s with no write errors. MySQL is now the strongest SQL
result in this profile, also completing all writes, though still behind the top
group. PostgreSQL is slower but clean. NATS is behind the top group but also
clean on writes. SQLite is overwhelmed.

SQLite is the exception on client errors in this profile: at c1000 its write
error rate is 88.7%. Standalone T4 had a noisy c1000 read run in this dataset,
but its write path stayed clean.

Under light load, the SQL backends look healthy. At `ops=500`,
`concurrency=10`, and unlimited HCP resources, PostgreSQL reaches 275 writes/s
with p99 write latency 57 ms and no errors. MySQL reaches 403 writes/s with p99
write latency 29 ms and no errors. The problem is not that SQL cannot work; the
problem is that high-concurrency control-plane traffic is much more demanding
than the light create/list path.

The read side is more ambiguous. Several backends show high read p99 latency at
concurrency 1000. That looks like API-server/client pressure as much as storage
pressure, so this profile is useful but not enough to choose a backend.

## Watch Churn: The Backend Has To Feed Controllers

The watch-churn test keeps 25 watches open while the client creates, updates,
updates again, and deletes 10,000 ConfigMaps. A healthy run delivers about
1,005,000 watch events.

At concurrency 1000, the median result was:

| storage              | write successes | write errors | watch events | watch p99 lag | watch event rate |
|----------------------|----------------:|-------------:|-------------:|--------------:|-----------------:|
| `etcd`               |          10,000 |         0.0% |    1,001,883 |          7.5s |          52.2k/s |
| `kine-postgres`      |           8,353 |        16.5% |      886,950 |          9.2s |          13.6k/s |
| `kine-mysql`         |           5,510 |        44.9% |      606,025 |          4.2s |          28.2k/s |
| `kine-sqlite`        |              77 |        99.2% |       35,500 |         27.1s |           0.4k/s |
| `kine-nats-embedded` |           9,012 |         9.9% |      544,175 |         58.8s |           6.3k/s |
| `kine-t4`            |          10,000 |         0.0% |    1,002,548 |          5.5s |          53.8k/s |
| `t4-standalone`      |          10,000 |         0.0% |    1,004,875 |          6.4s |          55.2k/s |

This is the strongest result in the benchmark. etcd, embedded T4, and
standalone T4 all deliver essentially the full expected watch stream with zero
write errors. T4 is not just passing a happy-path write test here; it is keeping
up with a watch-heavy workload in the same band as etcd.

The other backends tell different failure stories:

- SQLite hits `database is locked` and effectively stops being useful under
  write churn.
- Embedded NATS accepts many writes, but delivers only about half the expected
  watch events and has p99 watch lag near one minute.
- PostgreSQL improves substantially with the higher connection limit, but still
  starts failing writes at concurrency 1000.
- MySQL is faster per successful write in this profile, but its write error
  rate rises sharply as watch-churn concurrency increases.
- With only connection count tuned, the SQL setup should still be treated as a
  conservative baseline rather than a fully tuned database result.

## HCP Size: Limits Change The Shape Of The Bottleneck

We also varied the HCP pod size. This preset sweep used a smaller workload
(`ops=500`, `concurrency=10`) so it could show how resource limits affect
latency and throughput without immediately turning into a stress test.

The presets were:

| preset    |         CPU limit |      memory limit |
|-----------|------------------:|------------------:|
| tiny      |              250m |             512Mi |
| small     |              500m |             768Mi |
| medium    |             1000m |               1Gi |
| large     |             2000m |               2Gi |
| unlimited | no explicit limit | no explicit limit |

A few representative write-throughput results:

| storage         |      tiny |     small |    medium |     large |
|-----------------|----------:|----------:|----------:|----------:|
| `etcd`          |  98 ops/s | 198 ops/s | 379 ops/s | 457 ops/s |
| `kine-postgres` |   7 ops/s |  17 ops/s |  55 ops/s |  89 ops/s |
| `kine-mysql`    |  36 ops/s |  82 ops/s | 169 ops/s | 329 ops/s |
| `kine-t4`       |  70 ops/s | 160 ops/s | 308 ops/s | 412 ops/s |
| `t4-standalone` | 104 ops/s | 199 ops/s | 385 ops/s | 418 ops/s |

The pattern is exactly what an operator would expect: very small HCP limits cap
throughput quickly, and increasing CPU helps until the bottleneck moves
elsewhere. The practical lesson is that backend comparisons only make sense
when HCP size is part of the test description. A backend can look slow simply
because the API server and kine process are CPU-throttled.

With `250m` CPU and `512Mi` memory, embedded T4 reaches 70 writes/s with no
errors. That is below etcd's tiny result, but it is a valid density point rather
than a failure. For this workload, the `medium` and `large` presets are where
etcd and T4 start to show their intended shape. The `tiny` preset is useful as
a density stress point, but it is not a fair default for performance
comparisons.

## HA: Three Control-Plane Pods Change Cost, Not The Ranking

The HA sweep runs HCPs with three replicas instead of one. That changes the
resource model substantially, but the watch-churn ranking stays familiar.

At concurrency 1000:

| storage                 | write successes | write errors | watch events | watch p99 lag |
|-------------------------|----------------:|-------------:|-------------:|--------------:|
| `etcd-ha`               |          10,000 |         0.0% |    1,004,988 |          4.8s |
| `kine-postgres-ha`      |          10,000 |         0.0% |    1,004,491 |          9.7s |
| `kine-mysql-ha`         |           2,743 |        72.6% |      394,753 |          2.5s |
| `kine-nats-embedded-ha` |           7,018 |        29.8% |      391,075 |         28.8s |
| `kine-t4-ha`            |          10,000 |         0.0% |    1,005,000 |          3.7s |
| `t4-standalone-ha`      |          10,000 |         0.0% |    1,004,980 |          3.4s |

HA does not make a weak backend magically strong. It does, however, show that
T4 remains competitive when the control plane has three replicas. In this run,
both T4 modes delivered the full watch stream with lower p99 watch lag than
etcd-ha.

## k0smotron Overhead

The operator itself is not where most of the resources go. At 100 HCPs, sampled
operator memory stayed around 80-100 MiB and CPU stayed below half a core:

| storage              | operator memory | operator CPU | workqueue depth max |
|----------------------|----------------:|-------------:|--------------------:|
| `etcd`               |        82.6 MiB |         264m |                 408 |
| `kine-postgres`      |        35.5 MiB |         250m |                 294 |
| `kine-mysql`         |        82.0 MiB |         496m |                   5 |
| `kine-sqlite`        |        92.0 MiB |         434m |                 449 |
| `kine-nats-embedded` |        99.0 MiB |         403m |                   5 |
| `kine-t4`            |        96.0 MiB |         443m |                   5 |

That is an important operational result. When sizing a management cluster, the
main question is not "how large should the k0smotron operator be?" The main
question is how many HCP pods and storage pods the management cluster must run,
and how much headroom is needed for bursts when many control planes start or
recover at the same time.

## What We Can Say Today

For a default recommendation, etcd remains the safe baseline. It is predictable,
well understood, and handles both create/list and watch-churn cleanly.

For watch-heavy workloads, T4 deserves serious attention. Embedded T4 and
standalone T4 both match etcd's successful watch delivery in this run. Embedded
T4 keeps the deployment shape simple but counts storage cost inside the HCP pod.
Standalone T4 moves storage out of the HCP, but the total system cost must also
include T4 and object storage.

SQLite is a dependency-minimizing option, not a concurrency backend.

Embedded NATS needs more investigation before it can be recommended for
controller-heavy workloads. The watch-churn profile shows high lag and missing
watch delivery in this configuration.

PostgreSQL and MySQL are promising on provisioning and now complete the
high-concurrency create/list profile without client write errors. Their
watch-churn behavior is more sensitive to database configuration and retry
behavior. In this benchmark, only connection count is tuned; deeper database
engine tuning remains out of scope.

## What This Benchmark Does Not Cover

There are still important areas this benchmark does not cover:

1. It does not deeply tune PostgreSQL or MySQL beyond connection count.
2. It does not include a full total-cost view for standalone T4 object storage.
3. It does not test large Kubernetes objects or cross-AZ storage latency.
4. It does not test every possible controller workload; `watch-churn` is a
   useful approximation, not the whole universe.
