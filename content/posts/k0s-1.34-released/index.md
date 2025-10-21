---
title: "K0s 1.34 Released"
author: "Juan Luis de Sousa-Valadas Castaño"
date: 2025-10-16T11:11:27.563Z
lastmod: 2025-10-16T11:11:27.563Z
tags: [ "kubernetes", "k0s", "containers", "windows", "IPv6" ]
cover:
  image: 1.png
---

We're exicted to announce the release of **k0s 1.34** which introduces significant improvements in Windows node support, IPv6 single stack alpha automation, and build reproducibility.
This version continues the effort to make k0s a production-ready, minimal, and consistent Kubernetes distribution—optimized for both Linux and Windows environments.

---

## What’s New in Kubernetes 1.34

Upstream Kubernetes 1.34 includes stability and observability enhancements. Highlights include:

- **Pod Lifecycle Improvements:** Graceful shutdown handling for Windows nodes, improved Job Pod replacement policy, and fine-grained container restart rules.
- **Dynamic Resource Allocation (DRA) GA:** Structured allocation of GPUs, TPUs, NICs, and other devices with enhanced monitoring and prioritization.
- **Networking Enhancements:** Direct Server Return (DSR) support in Windows kube-proxy for reduced latency and load on the balancer.
- **Volume and Storage Updates:** VolumeAttributesClass GA and recovery from volume expansion failures improve flexibility and reliability.
- **Pod-level Resource Management (Beta):** Define total Pod resources shared across multiple containers, simplifying scheduling.
- **Container Lifecycle Hooks:** Stable Sleep action for PreStop/PostStart hooks to improve lifecycle management.
- **Streaming and Caching Improvements:** Streaming LIST responses and resilient watch cache initialization reduce memory pressure and improve API server performance.
- **Security Enhancements:** Pod certificates for mTLS authentication (Alpha), mutating admission policies (Beta), and stricter anonymous request controls.

Refer to the [Kubernetes 1.34 release notes](https://kubernetes.io/blog/2025/08/27/kubernetes-v1-34-release/) for details.

---

## What’s New in k0s 1.34

This release focuses on four key areas: IPv6 networking, Windows stability and integration, feature gating, and developer automation.

---

### Windows Node Improvements

While Windows support isn't production ready yet, it continues to mature in this release, improving node lifecycle, process management, and cluster consistency.

- Refined **kubelet process cleanup** during node shutdown and restart sequences to prevent stale processes.
- Enhanced **Windows service stop handling**, ensuring kubelet exits cleanly under SIGTERM-equivalent events.
- Added **semantic kubelet configuration validation** for Windows worker profiles, preventing invalid kubelet settings from applying.
- Fixed **path resolution issues** in worker runtime directory initialization, ensuring reliable setup on Windows hosts.
- Improved **CRI runtime connection management** for Windows containers, reducing transient startup failures.
- Validated **dual-stack networking configurations** for mixed Linux/Windows clusters.
- Ensured **Calico Windows components** align with new IPv6 and security context changes.
- Improved **PowerShell-based packaging scripts** for agent binaries and runtime dependencies.
- Strengthened **cross-platform conformance testing**, ensuring parity between Linux and Windows node behavior.

These changes significantly improve reliability for Windows-based worker nodes and pave the way for smoother hybrid cluster operations.

### IPv6 Single-Stack

K0s 1.34 introduces alpha IPv6 only clusters for modern or constrained deployments. Previously k0s only supported IPv4 single-stack or
IPv4 and IPv6 dual-stack. All k0s features are implemented in IPv6 single stack, including both calico and kube-router support, NLLB, CPLB
among other features.

Learn more in our [IPv6 Single-Stack documentation](https://docs.k0sproject.io/stable/single-stack-ipv6/).

### Feature Gates

Introduced **k0s Feature Gates**, allowing selective enablement of experimental capabilities without code changes.
This simplifies controlled testing and validation of new functionality before general availability. Currently the only feature gate was introduced
for IPv6 single-stack.

For more details, see our [Feature Gates documentation](https://docs.k0sproject.io/stable/feature-gates/).

### Core Component Updates

*   **Kubernetes** upgraded to **v1.34.1**
*   **CoreDNS** updated to **v1.13.1**
*   **etcd** upgraded to **v3.6.5**
*   **Helm** updated to **v3.19.0**
*   **Calico** upgraded to **v3.29.6**
*   **Kube-router** upgraded to **v2.6.1**
*   **Go Runtime** updated to **v1.24.8**
*   **containerd** upgraded to **v1.7.28**
*   **runc** updated to **v1.3.2** for security and performance updates.

### CLI and Configuration Improvements

- `k0s kubeconfig create` adds `--context-name` flag for more flexible multi-cluster configurations.
- Enhanced **worker profile validation** for both Linux and Windows.
- Refined **error reporting and lock handling** in cluster initialization routines.

## Key Statistics

- **Commits:** 858
- **Pull Requests:** 364
- **Contributors:** 32
- **New Contributors:** 8

## Get Started

Download **k0s 1.34** from the [GitHub releases page](https://github.com/k0sproject/k0s/releases) and explore the [documentation](https://docs.k0sproject.io/) for IPv6 and Windows cluster setup guides.

Experience more reliable Windows nodes, improved networking flexibility, and greater operational automation in this release.
