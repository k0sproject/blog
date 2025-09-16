---
title: "k0s 1.32 Release: What’s New in Lightweight Kubernetes"
author: "Jussi Nummelin"
date: 2025-01-29T08:11:17.482Z
lastmod: 2025-09-16T16:27:03+02:00
aliases:
    - "/k0s-1-32-release-whats-new-in-lightweight-kubernetes-47b1b0bb7123"
tags: [ "kubernetes", "k0s", "containers" ]
cover:
  image: 1.webp
  caption: Photo by [Lorenzo Herrera](https://unsplash.com/@lorenzoherrera?utm_source=medium&amp;utm_medium=referral) on [Unsplash](https://unsplash.com?utm_source=medium&amp;utm_medium=referral)
---

We’re excited to announce the release of k0s **1.32**, packed with powerful enhancements, critical fixes, and new features. This release continues to solidify [k0s](https://k0sproject.io/) as the lightweight and secure Kubernetes distribution for modern workloads.

### What’s new in Kubernetes 1.32

As always, a new Kubernetes minor release comes with tons of fixes and some new features. Here are a few changes that we wanted to highlight in the Kubernetes 1.32 release.

**Security Improvements**: Addressed `CVE-2024–9042`, a Windows node vulnerability, ensuring better security for querying node logs.

**API Enhancements**:

*   Increased pod limits for shared `ResourceClaims` from 32 to 256.
*   Introduced support for asynchronous pod preemption and resizing pod resources using a `/resize` subresource.
*   Added the `singleProcessOOMKill` flag for cgroups v2 to prevent entire containers from being OOM killed when a single process exceeds memory limits.
*   Enabled stricter validation and features for mutating admission policies.

**Feature Updates**:

*   Promoted multiple features to GA, including `StatefulSetAutoDeletePVC`, `RetryGenerateName`, and the Kubernetes memory manager.
*   Improved scheduler performance with advanced `QueueingHint` and reduced memory consumption.
*   Added new kubelet metrics and support for systemd watchdog integration.

**Bug Fixes**: Resolved issues in `kube-controller-manager`, `kube-scheduler`, and `kubelet`, including `StatefulSet` handling, storage bugs, and race conditions during node restarts.

**Dependency Updates**: Built with Go 1.23.4 for performance and compatibility improvements​

For more details, see the full Kubernetes 1.32 [release notes](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.32.md).

### What’s New in k0s 1.32

This k0s release comes with a few noteworthy user-facing improvements but as always, behind the scenes, there are plenty of fixes, enhancements, and refactorings that make k0s more stable and secure. See the full changelog on the GitHub [release page](https://github.com/k0sproject/k0s/releases).

### Key Features and Enhancements

*   **Runtime Configuration Enhancements**:
**New Output Formats**: The k0s sysinfo command now features a flag for structured output, streamlining integration into automated workflows.
**Streamlined API Configurations**: API subcommands now support runtime configurations via stdin, removing the need for defaults and simplifying complex setups.
*   **Kubernetes and Core Component Updates**:
**Kubernetes** upgraded to **1.32.1**, bringing the latest features, security fixes, and deprecation handling for legacy APIs.
Networking improvements with **Calico 3.29.1** and enhanced DNS reliability with **CoreDNS 1.12.0**.
*   **User space proxy support in Control Plane Load Balancing (CPLB):** For environments where IPVS is unavailable or the networking layer doesn’t behave well with IPVS. Stay tuned for a more detailed blog post for the entire CPLB feature.
*   **Build and Deployment Optimizations**:
Updated CI/CD pipelines to use **Ubuntu 24.04** for increased compatibility with modern environments.
Added support for custom kubelet root directories with the`--kubelet-root-dir` flag, allowing users more flexibility in managing storage and configurations.
*   **Security and Maintenance**:
Patched several CVEs, including **CVE-2024–9042**, ensuring a secure runtime environment.
Added linters such as `_nolintlint_` and `_perfsprint_` to improve code maintainability and performance over time.

### Core Component Updates

*   **Calico** upgraded to **3.29.1** for improved networking performance.
*   **CoreDNS** updated to **1.12.0**, providing more reliable DNS functionality.
*   **Containerd** upgraded to **1.7.24**, ensuring better compatibility and performance.

### Major Fixes

### Etcd Stability Improvements

*   Fixed an issue where nodes could inadvertently create new clusters during initial etcd sync failures.
*   Introduced retry logic for more robust handling of etcd leader resynchronization.

### Locking and Configuration Reliability

*   Replaced PID-based runtime configuration locking with file-based locks (flock), improving reliability in multi-instance setups.
*   Resolved cache issues related to node configuration, ensuring consistent and reliable reads.

### Key Statistics for 1.32

*   **Total Commits:** 132
*   **Merged Pull Requests:** 87
*   **Contributors:** 14
*   **Updated Dependencies:** 20+

### Get Started Today

Download the latest release of [k0s 1.32](https://github.com/k0sproject/k0s) and explore the updated documentation to experience the improvements firsthand.

Let us know what you think of the new release and how we can continue to improve!


