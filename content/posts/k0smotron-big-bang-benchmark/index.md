---
title: "The k0smotron Big Bang Benchmark"
author: "Alexey Makhov"
date: 2026-05-05
lastmod: 2026-05-05T10:13:18+03:00
aliases:
    - "/k0smotron-big-bang-benchmark"
tags: ["kubernetes", "cluster API", "k0s", "k0smotron", "benchmark", "etcd"]
cover:
  image: cover.png
---

With k0smotron, every workload cluster gets a Kubernetes control plane that runs as pods inside a management cluster.
Hosted control planes (HCPs) become ordinary Kubernetes workloads: schedulable, patchable, killable like any other
Deployment.

The tradeoff is that the management cluster pays the bill. Ten HCPs cost almost nothing. A hundred is a different story.
Storage backends, pod limits, watch delivery, and k0smotron reconciliation all start to matter at the same time, and the
question is which one cracks first.

Our benchmark sets out to answer three concrete questions:

1. **Capacity.** How much CPU and memory does it take to run 10, 50, and 100 hosted control planes?
2. **Backend behavior.** How do storage backends (etcd, kine on PostgreSQL/MySQL/SQLite, embedded NATS, embedded T4,
   standalone T4) perform under realistic Kubernetes API load?
3. **k0smotron overhead.** Is the operator itself a bottleneck, or do the HCP pods and their storage dominate?

TLDR:

- The k0smotron operator is small. At 100 HCPs it stays below half a core and under 100 MiB. The cost lives in the HCP
  pods and their storage, not in the operator.
- Backend choice changes everything else: where the CPU lands, how much memory you need, and whether watches stay
  healthy when objects are changing fast.
- T4 is the most interesting result here. Embedded T4 and standalone T4 both land in the etcd performance band on
  watch-heavy workloads, and embedded T4 has the smallest 100-HCP footprint of any tested backend.
- SQLite is fine for tiny or dependency-free setups but collapses under concurrent writes (88.7% write error rate at
  c1000).
- Embedded NATS accepts writes, but does not feed watches reliably once churn picks up. p99 watch lag sits near 60
  seconds.
- PostgreSQL and MySQL handle high-concurrency create/list cleanly once connection limits are raised. Watch-churn still
  surfaces tuning and retry behavior.

The rest of this post walks through the numbers, what they mean for sizing, and where the test stops short.

## What we built and what we measured

The benchmark ran on AWS in a single availability zone to avoid cross-AZ latency noise.

| role                             | shape                                  |
|----------------------------------|----------------------------------------|
| management control-plane node    | `c5.4xlarge`, 16 vCPU, 32 GiB          |
| management workers               | 3 x `m5.4xlarge`, 16 vCPU, 64 GiB each |
| PostgreSQL node                  | `r6i.xlarge`, io2 data disk            |
| MySQL node                       | `r6i.xlarge`, io2 data disk            |
| MinIO node for T4 object storage | `r6i.large`, io2 data disk             |

The database setup is intentionally conservative. PostgreSQL and MySQL were not heavily tuned. For benchmark runs we
raised their connection limits so the test could reach higher HCP counts and client concurrency: both at
`max_connections=2000`. We did not tune shared buffers, InnoDB buffer pool size, IO capacity, checkpoint behavior, or
query settings. The SQL numbers below are closer to "mostly default DB with enough connections" than to "expertly tuned
production database".

The storage variants:

| storage              | shape                                      |
|----------------------|--------------------------------------------|
| `etcd`               | per-HCP etcd StatefulSet                   |
| `kine-postgres`      | k0s+kine using external PostgreSQL         |
| `kine-mysql`         | k0s+kine using external MySQL              |
| `kine-sqlite`        | k0s+kine using SQLite inside the HCP pod   |
| `kine-nats-embedded` | k0s with embedded NATS storage             |
| `kine-t4`            | k0s+kine with T4 embedded in the HCP pod   |
| `t4-standalone`      | k0s using external T4 through the etcd API |

A hosted control plane (HCP) is the pod, or set of pods, running the Kubernetes API server and supporting components for
one workload cluster. Where storage lives depends on the backend:

- with `etcd`, storage runs as a separate per-HCP StatefulSet
- with PostgreSQL or MySQL, storage is a database pod on a separate node
- with SQLite, embedded NATS, or embedded T4, storage runs inside the HCP pod
- with standalone T4, storage is a separate T4 pod plus MinIO for object storage

For sizing, we report two columns. **HCP** is CPU and memory used by hosted control-plane pods. **Total** is HCP plus
any separate storage pods, sampled at peak. For embedded backends, HCP and Total match because the storage process
already counts inside the HCP pod. For etcd and external SQL backends, the gap between HCP and Total is the cost of the
separate storage pods. For standalone T4, Total does not include object-storage cost; a full production sizing should
add it separately.

Two API workload profiles ran across the storage variants:

| profile       | what it tests                                     |
|---------------|---------------------------------------------------|
| `create-list` | create ConfigMaps, then list them back            |
| `watch-churn` | 25 watches plus create/update/update/delete churn |

`create-list` is a throughput and latency test. `watch-churn` is closer to control-plane reality, because Kubernetes
controllers work by opening watches and reacting to changes. If watch delivery falls behind, controllers fall behind
with it.

Concurrency swept 50, 200, 500, and 1000 clients. The low end shows ordinary pressure. The high end shows where things
crack.

## Capacity: what 10, 50, and 100 HCPs cost

The scale test creates HCPs with parallelism 10 and measures readiness time, plus sampled CPU and memory while the
scenario runs.

### 10 HCPs

| storage              | p50 ready | p99 ready | HCP CPU | HCP mem | total CPU | total mem |
|----------------------|----------:|----------:|--------:|--------:|----------:|----------:|
| `etcd`               |     28.6s |     75.1s |     3.2 | 2.0 GiB |       3.7 |   2.4 GiB |
| `kine-postgres`      |     20.1s |     30.1s |    11.1 | 4.0 GiB |      13.6 |   4.8 GiB |
| `kine-mysql`         |     22.1s |     34.1s |     9.8 | 3.9 GiB |      10.5 |   4.8 GiB |
| `kine-sqlite`        |     20.2s |     22.2s |    14.5 | 3.9 GiB |      14.5 |   3.9 GiB |
| `kine-nats-embedded` |     26.2s |     36.1s |    12.0 | 3.9 GiB |      12.0 |   3.9 GiB |
| `kine-t4`            |     20.3s |     24.3s |     7.0 | 3.4 GiB |       7.0 |   3.4 GiB |

### 50 HCPs

| storage              | p50 ready | p99 ready | HCP CPU |  HCP mem | total CPU | total mem |
|----------------------|----------:|----------:|--------:|---------:|----------:|----------:|
| `etcd`               |     21.6s |     74.1s |    17.3 |  9.7 GiB |      20.1 |  10.8 GiB |
| `kine-postgres`      |     12.1s |     18.1s |    46.8 | 19.8 GiB |      47.9 |  22.5 GiB |
| `kine-mysql`         |     12.1s |     20.1s |    36.9 | 17.0 GiB |      37.5 |  20.3 GiB |
| `kine-sqlite`        |     16.1s |     22.1s |    64.5 | 20.1 GiB |      64.5 |  20.1 GiB |
| `kine-nats-embedded` |     22.0s |     42.1s |    63.9 | 20.2 GiB |      63.9 |  20.2 GiB |
| `kine-t4`            |     16.1s |     26.1s |    39.2 | 18.7 GiB |      39.2 |  18.7 GiB |

### 100 HCPs

| storage              | p50 ready | p99 ready | HCP CPU |  HCP mem | total CPU | total mem |
|----------------------|----------:|----------:|--------:|---------:|----------:|----------:|
| `etcd`               |     22.5s |     80.2s |    36.5 | 19.3 GiB |      42.1 |  21.2 GiB |
| `kine-postgres`      |     18.0s |     30.2s |    99.2 | 52.1 GiB |     102.4 |  55.9 GiB |
| `kine-mysql`         |     16.1s |     22.1s |   111.5 | 40.7 GiB |     113.1 |  42.0 GiB |
| `kine-sqlite`        |     20.0s |     34.1s |   119.2 | 41.2 GiB |     119.2 |  41.2 GiB |
| `kine-nats-embedded` |     24.2s |     46.2s |   129.2 | 41.7 GiB |     129.2 |  41.7 GiB |
| `kine-t4`            |     20.1s |     32.1s |    98.5 | 40.7 GiB |      98.5 |  40.7 GiB |

Three things stand out.

Cost scales with HCP count rather than against a cliff. Going from 50 to 100 clusters roughly doubles the footprint
instead of falling off a sudden ledge. That's the friendly news for capacity planning.

etcd has a smaller HCP footprint than any kine variant. At 100 HCPs, etcd plus its StatefulSet sums to 42.1 cores total.
The kine variants land between 98 and 129 cores. Part of the gap comes from storage placement, but the kine layer itself
does work: proxying the etcd API to a different backend, batching writes, fanning out watches. Looks like that work
shows up as CPU and memory on top of whatever storage is doing.

Provisioning latency does not move with resource use. The variance comes from storage bring-up, not from k0smotron
reconciliation. The operator does its job and gets out of the way.

## Pushing harder: how performance shifts under load

Each profile ran across four concurrency levels: 50, 200, 500, and 1000 clients. The low end shows ordinary pressure.
The high end is where backends start to crack. The charts below show the shape of each backend's curve, and the next two
sections drill into the c1000 numbers.

The SQL rows use the connection-tuned setup described above. Enough to avoid measuring a connection-limit cliff, not
enough to call it a tuned database.

### create-list write throughput

{{< chart src="create-list-throughput.chart.json" caption="create-list write throughput vs concurrency" ariaLabel="create-list write throughput vs concurrency" />}}

Three tiers separate cleanly. etcd, both T4 modes, and MySQL push 1000-3000 writes/s. etcd and the T4 lines track each
other almost exactly: same dip near c200, same recovery at c1000. MySQL climbs steadily and plateaus around 2000
writes/s. PostgreSQL plateaus around 600 writes/s. NATS is unsteady, with a clear dip at c200 before recovering. SQLite
is flat at the floor (~10 ops/s) and failing most of its writes — average write error rate climbs from 31.9% at c50 to
88.7% at c1000.

### watch-churn p99 lag

{{< chart src="watch-churn-lag.chart.json" caption="watch-churn p99 watch lag vs concurrency" ariaLabel="watch-churn p99 watch lag vs concurrency" />}}

This is where backends sort themselves into "feeds controllers" and "does not". etcd and both T4 modes stay below 8
seconds even at c1000, starting in the 80-100ms range at c50. PostgreSQL and MySQL climb but stay under 10 seconds.
SQLite parks itself near 27 seconds across the whole sweep. NATS sits in a class of its own at 22-52 seconds. A
controller pointed at NATS would visibly fall behind real time.

### watch-churn event rate

{{< chart src="watch-churn-eventrate.chart.json" caption="watch-churn watch event rate vs concurrency" ariaLabel="watch-churn watch event rate vs concurrency" />}}

This chart shows whether the storage keeps up with the event rate the workload generates. etcd and both T4 modes plateau
around 50-55k events/s. MySQL holds 28-34k. PostgreSQL sits at 13-15k. NATS delivers 7-8k, far below the workload's
event rate, which matches what the lag chart implied. SQLite is at the floor (~400 events/s) and out of contention.

The operational ranking lives in those three charts. etcd and both T4 modes are the only backends with near-zero client
errors and near-complete watch delivery across the full watch-churn sweep. PostgreSQL averages 9-15% write errors and
89-96% watch delivery. MySQL averages 12-45% write errors and 60-89% watch delivery. SQLite collapses on writes. NATS
accepts writes but does not feed watches reliably under churn.

## Create/list at c1000: writes are half the story

At concurrency 1000, the median single-node `create-list` results:

| storage              | write throughput | write p99 | read throughput | read p99 |
|----------------------|-----------------:|----------:|----------------:|---------:|
| `etcd`               |       2920 ops/s |    0.673s |       168 ops/s |    15.4s |
| `kine-postgres`      |        644 ops/s |    4.116s |       160 ops/s |    13.4s |
| `kine-mysql`         |       2006 ops/s |    2.115s |       179 ops/s |    14.3s |
| `kine-sqlite`        |         14 ops/s |   13.996s |       731 ops/s |     3.4s |
| `kine-nats-embedded` |        929 ops/s |    2.000s |       153 ops/s |    15.3s |
| `kine-t4`            |       2941 ops/s |    0.601s |       167 ops/s |    14.3s |
| `t4-standalone`      |       2842 ops/s |    0.597s |       210 ops/s |    13.5s |

The write side has a clear top group. etcd, embedded T4, and standalone T4 all land near 2900 writes/s with no write
errors. MySQL is the strongest SQL result here, completing all writes but behind the top group. PostgreSQL is slower but
clean. NATS sits behind the top group, also clean on writes. SQLite is overwhelmed at 88.7% write errors.

Under light load, the SQL backends look healthy. At `ops=500`, `concurrency=10`, with unlimited HCP resources,
PostgreSQL reaches 275 writes/s (p99 57 ms, no errors) and MySQL reaches 403 writes/s (p99 29 ms, no errors). The point
is not that SQL cannot work. It is that high-concurrency control-plane traffic asks more of a backend than a light path
does.

The read side is murkier. Several backends show high read p99 at c1000. That looks like API-server and client pressure
as much as storage pressure. This profile is useful but does not pick a backend on its own.

## Watch churn at c1000: storage has to feed the controllers

The watch-churn test keeps 25 watches open while the client creates, updates, updates again, and deletes 10,000
ConfigMaps. A healthy run delivers about 1,005,000 watch events.

At c1000, the median:

| storage              | write successes | write errors | watch events | watch p99 lag | watch event rate |
|----------------------|----------------:|-------------:|-------------:|--------------:|-----------------:|
| `etcd`               |          10,000 |         0.0% |    1,001,883 |          7.5s |          52.2k/s |
| `kine-postgres`      |           8,353 |        16.5% |      886,950 |          9.2s |          13.6k/s |
| `kine-mysql`         |           5,510 |        44.9% |      606,025 |          4.2s |          28.2k/s |
| `kine-sqlite`        |              77 |        99.2% |       35,500 |         27.1s |           0.4k/s |
| `kine-nats-embedded` |           9,012 |         9.9% |      544,175 |         58.8s |           6.3k/s |
| `kine-t4`            |          10,000 |         0.0% |    1,002,548 |          5.5s |          53.8k/s |
| `t4-standalone`      |          10,000 |         0.0% |    1,004,875 |          6.4s |          55.2k/s |

This is the strongest result in the benchmark. etcd, embedded T4, and standalone T4 all deliver the full watch stream
with zero write errors.

The other backends fail in different ways:

- SQLite hits `database is locked` and stops being useful under write churn.
- Embedded NATS accepts most writes but delivers about half the expected watch events, with p99 lag near a minute.
- PostgreSQL improves with the higher connection limit but still drops some writes at c1000.
- MySQL is faster per successful write, but its error rate climbs sharply with watch-churn concurrency.
- With only connection count tuned, treat the SQL setup as a conservative baseline, not a fully tuned database result.

## HCP size: the bottleneck moves when the limits move

We also varied HCP pod size. This sweep used a smaller workload (`ops=500`, `concurrency=10`) so it could show how
resource limits affect latency and throughput without immediately turning into a stress test.

The presets:

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

The pattern is what an operator would expect. Tight CPU limits cap throughput quickly. Adding CPU helps until the
bottleneck moves elsewhere. The practical lesson: backend comparisons only make sense when HCP size is part of the test
description. A backend can look slow because the API server and the kine process are CPU-throttled.

At `250m`/`512Mi`, embedded T4 reaches 70 writes/s with no errors. That is below etcd's tiny result, but a valid density
point rather than a failure. For this workload, `medium` and `large` are where etcd and T4 show their intended shape.
`tiny` is useful as a density stress point, not a fair default for performance comparisons.

## HA: three replicas change cost, not the ranking

The HA sweep runs HCPs with three replicas instead of one. Resource model changes substantially. Watch-churn ranking
does not.

At c1000:

| storage                 | write successes | write errors | watch events | watch p99 lag |
|-------------------------|----------------:|-------------:|-------------:|--------------:|
| `etcd-ha`               |          10,000 |         0.0% |    1,004,988 |          4.8s |
| `kine-postgres-ha`      |          10,000 |         0.0% |    1,004,491 |          9.7s |
| `kine-mysql-ha`         |           2,743 |        72.6% |      394,753 |          2.5s |
| `kine-nats-embedded-ha` |           7,018 |        29.8% |      391,075 |         28.8s |
| `kine-t4-ha`            |          10,000 |         0.0% |    1,005,000 |          3.7s |
| `t4-standalone-ha`      |          10,000 |         0.0% |    1,004,980 |          3.4s |

HA does not turn a weak backend strong. It does show that T4 stays competitive when the control plane has three
replicas. In this run, both T4 modes delivered the full watch stream with lower p99 watch lag than etcd-ha.

## k0smotron itself: small enough to ignore

The operator is not where most of the resources go. At 100 HCPs, sampled operator memory stays around 80-100 MiB and CPU
stays below half a core:

| storage              | operator memory | operator CPU | workqueue depth max |
|----------------------|----------------:|-------------:|--------------------:|
| `etcd`               |        82.6 MiB |         264m |                 408 |
| `kine-postgres`      |        35.5 MiB |         250m |                 294 |
| `kine-mysql`         |        82.0 MiB |         496m |                   5 |
| `kine-sqlite`        |        92.0 MiB |         434m |                 449 |
| `kine-nats-embedded` |        99.0 MiB |         403m |                   5 |
| `kine-t4`            |        96.0 MiB |         443m |                   5 |

That changes the question. When sizing a management cluster, the right thing to estimate is not "how big should the
k0smotron operator be?" It is how many HCP pods and storage pods the cluster has to run, and how much headroom you want
for bursts when many control planes start or recover at the same time.

## What we'd say today

For a default recommendation, etcd remains the safe baseline. It is predictable, well understood, and handles both
create/list and watch-churn cleanly.

T4 stays close to etcd and keeps the deployment shape simple, but adds an object storage dependency.

SQLite is a dependency-minimizing option, not a concurrency backend.

Embedded NATS needs more investigation before it can be recommended for controller-heavy workloads. Watch-churn shows
high lag and missing watch delivery in this configuration.

PostgreSQL and MySQL look promising on provisioning and complete the high-concurrency `create-list` profile without
write errors. Their watch-churn behavior is more sensitive to database configuration and retry behavior. Only connection
count was tuned here; deeper engine tuning is out of scope.

## What this benchmark does not cover

1. PostgreSQL and MySQL were not deeply tuned beyond connection count.
2. The total-cost view for standalone T4 does not include object-storage sizing.
3. Large Kubernetes objects and cross-AZ storage latency were not tested.
4. `watch-churn` approximates controller traffic. It does not cover everything controllers do in real clusters.

These numbers came out of one specific setup. If you're sizing for your own workload, re-run the test on your config
before committing to a backend. The ranking will probably hold; the absolute numbers won't.
