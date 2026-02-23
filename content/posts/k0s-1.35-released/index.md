---
title: "k0s 1.35 Released: Bringing Kubernetes 1.35 with Enhanced Windows Support and Modern Storage Backend"
date: 2026-02-20
draft: false
author: Jussi Nummelin (@jnummelin)
tags: ["k0s", "release", "kubernetes", "windows", "storage"]
cover:
  image: k8s-timbernetes.png
  alt: "Kubernetes v1.35 Timbernetes logo: a storybook hex badge with a glowing world tree whose branches cradle Earth and a white Kubernetes wheel"
  caption: "Kubernetes 1.35 Timbernetes (The World Tree Release) - Image from [Kubernetes v1.35 Release Announcement](https://kubernetes.io/blog/2025/12/17/kubernetes-v1-35-release/)"
---

We're excited to announce the release of k0s 1.35, our lightweight Kubernetes distribution now powered by Kubernetes 1.35.1! This release represents a significant step forward with maturing Windows node support that’s closer to feature parity with Linux, a modernized storage backend, and numerous enhancements focused on security, reliability, and operator experience.

k0s 1.35 brings the latest upstream Kubernetes innovations to your clusters while maintaining our commitment to zero friction, zero dependencies, and zero cost. Let's dive into what's new!

---

## What's New in Kubernetes 1.35

Kubernetes 1.35 introduces several important enhancements to the upstream project:

- **In-Place Pod Vertical Scaling (GA)**: Resize CPU and memory requests for running pods without restarts, now generally available for production workloads
- **Image Volume Source (Beta)**: Mount OCI images directly as volumes, enabling new patterns for application packaging and delivery
- **Gang Scheduling (Alpha)**: Support for "all-or-nothing" scheduling using the new Workload API, ideal for HPC and ML workloads
- **Pod Certificates (Beta)**: Enhanced certificate management for pods with new user annotations support
- **DRA**: The DynamicResourceAllocation feature gate for the core functionality (GA in v1.34) has now been locked to enabled-by-default and cannot be disabled anymore.
- **Enhanced HPA**: Configurable tolerance is now beta, providing more flexibility in horizontal pod autoscaling

For complete details on Kubernetes 1.35 features, see the [official Kubernetes 1.35 release notes](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.35.md).

---

## What's New in k0s 1.35

### Windows Node Enhancements

k0s 1.35 significantly expands Windows support with two major improvements that bring feature parity closer to Linux nodes:

**`k0s status` Command on Windows Workers** ([#6719](https://github.com/k0sproject/k0s/pull/6719))

Windows node administrators can now use the familiar `k0s status` command to check the health and state of their nodes. This provides consistent operational experience across Linux and Windows nodes, making it easier to manage heterogeneous clusters.

**`k0s reset` Command on Windows** ([#6768](https://github.com/k0sproject/k0s/pull/6768))

The `k0s reset` command is now available on Windows, allowing for clean node resets and easier troubleshooting. This completes the Windows node lifecycle management story, enabling you to provision, manage, and decommission Windows workers with the same commands used on Linux.

These enhancements make k0s one of the most Windows-friendly Kubernetes distributions available, perfect for organizations running mixed operating system environments. More importantly, these sub-commands enable [k0sctl](https://github.com/k0sproject/k0sctl) to fully support Windows also for cluster lifecycle management, making it easier than ever to manage Windows nodes at scale.

---

### Control Plane Load Balancer Custom Templates

**CPLB Custom Templates** ([#6894](https://github.com/k0sproject/k0s/pull/6894))

k0s 1.35 introduces customizable templates for the Control Plane Load Balancer (CPLB), giving you fine-grained control over load balancer configuration. This feature allows you to:

- Customize load balancing algorithms and behavior
- Add custom health checks and monitoring
- Integrate with existing infrastructure patterns
- Support advanced networking requirements

This flexibility makes k0s adaptable to diverse infrastructure requirements while maintaining the simplicity of built-in load balancing.

---

### Storage Backend Modernization

**SQLite Replaces rqlite** ([#6515](https://github.com/k0sproject/k0s/pull/6515))

k0s 1.35 modernizes its storage backend by replacing rqlite with modernc.org/sqlite. This change brings:

- **Better Performance**: Improved read/write throughput for smaller clusters
- **Reduced Dependencies**: Simpler codebase with fewer external dependencies
- **Enhanced Reliability**: More mature and widely-tested SQLite implementation
- **Smaller Footprint**: Reduced resource consumption for control plane nodes

**CGO Disabled** ([#6669](https://github.com/k0sproject/k0s/pull/6669))

In conjunction with the SQLite update, k0s now builds without CGO, resulting in:

- Faster compilation times
- Better cross-platform portability
- Simplified build process and debugging

These changes strengthen k0s's position as a truly lightweight distribution that's easy to build, deploy, and maintain.

---

### Security and Compliance Improvements

k0s 1.35 includes several security enhancements to help you meet compliance requirements:

**CIS Benchmark Updates** ([#6507](https://github.com/k0sproject/k0s/pull/6507), [#6512](https://github.com/k0sproject/k0s/pull/6512))

File permissions have been tightened to meet CIS Kubernetes Benchmark 1.11 recommendations:

- admin.conf and kubelet config.yaml now use 0600 permissions
- ccm.conf and scheduler.conf follow the same security standards

**mTLS Support for Helm OCI Registries** ([#6888](https://github.com/k0sproject/k0s/pull/6888))

Helm extensions can now authenticate to OCI registries using mutual TLS, enabling secure integration with enterprise artifact repositories without exposing credentials.

**Certificate Renewal for Custom CAs** ([#6380](https://github.com/k0sproject/k0s/pull/6380))

k0s now supports automatic certificate renewal even when using custom Certificate Authorities, eliminating a common pain point for organizations with PKI requirements.

**Enhanced IPv6 Validation** ([#6874](https://github.com/k0sproject/k0s/pull/6874), [#6924](https://github.com/k0sproject/k0s/pull/6924))

Improved validation for IPv6 ServiceCIDRs ensures proper configuration in dual-stack and IPv6-only environments, catching configuration errors before they cause runtime issues.

**SELinux Improvements** ([#7063](https://github.com/k0sproject/k0s/pull/7063), [#7097](https://github.com/k0sproject/k0s/pull/7097), [#7118](https://github.com/k0sproject/k0s/pull/7118))

Better SELinux support for Node-Local Load Balancer (NLLB) and containerd binaries ensures k0s runs correctly on security-focused distributions like RHEL and CentOS.

---

### Developer Experience Improvements

**`--start` Flag for Install Command** ([#6753](https://github.com/k0sproject/k0s/pull/6753))

The `k0s install` command now supports a `--start` flag to automatically start the k0s service after installation, streamlining the setup process:

```bash
k0s install controller --start
```

**K0S_TOKEN Environment Variable** ([#6766](https://github.com/k0sproject/k0s/pull/6766))

Worker nodes can now use the `K0S_TOKEN` environment variable as a source for join tokens, making automation and secret management easier in containerized or orchestrated environments.

**Optimized Join API** ([#6569](https://github.com/k0sproject/k0s/pull/6569))

The k0s join API now starts only when needed, reducing resource consumption on controllers that don't need to accept new nodes.

**Helm Reconciler Refactoring** ([#7060](https://github.com/k0sproject/k0s/pull/7060), [#7083](https://github.com/k0sproject/k0s/pull/7083))

The Helm extension reconciler has been refactored to use ephemeral environments and support embedding repository information directly in Chart CRDs, enabling more flexible GitOps workflows. The Chart CR are now fully self-contained, allowing for easier management and deployment of Helm charts without cross-dependencies with k0s configuration. Chart CRs now support configuring repository credentials via Kubernetes secrets, making it easier to integrate with private Helm repositories in a secure manner.

---

### Additional Notable Features

**Autopilot Improvements** ([#6848](https://github.com/k0sproject/k0s/pull/6848))

Autopilot now manages node draining and cordoning via the controller, improving reliability during automated upgrades.

**Containerd Deprecation Monitoring** ([#7025](https://github.com/k0sproject/k0s/pull/7025))

Worker nodes now monitor for deprecated containerd features, helping you stay ahead of upstream changes.

**Supervisor Context Support** ([#6865](https://github.com/k0sproject/k0s/pull/6865))

The internal supervisor now accepts contexts for better shutdown handling and component lifecycle management.

---

## Component Updates

k0s 1.35 includes updates to all major components:

| Component      | Version |
|----------------|---------|
| Kubernetes     | 1.35.1  |
| etcd           | 3.6.8   |
| containerd     | 1.7.30  |
| Calico         | 3.31.3  |
| kube-router    | 2.7.1   |
| CoreDNS        | 1.14.1  |
| Helm           | 3.20.0  |
| Konnectivity   | 0.34.0  |
| Metrics Server | 0.8.1   |

---

## Release Statistics

The k0s 1.35 release represents substantial community effort:

- **200+ Pull Requests** merged
- **350+ Commits** from contributors worldwide
- **20** individual contributors participated in this release, including core maintainers and new contributors alike.
- **9 New Contributors** joined the project:
  - @sakshisharma84
  - @valleyflowerbear
  - @skl
  - @hille721
  - @shikanime
  - @shinebayar-g
  - @L3st86
  - @Kasurus
  - @mback2k

Thank you to everyone who contributed code, documentation, testing, and feedback!

---

## Meet Us at KubeCon + CloudNativeCon Europe 2026

The k0s team will be at [KubeCon + CloudNativeCon Europe 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/) in Amsterdam from **March 23-26, 2026**!

**Visit the k0s Community Booth** at the Project Pavilion to:
- Meet k0s maintainers and contributors
- Get hands-on demos of the latest features
- Learn about k0s deployment best practices
- Discuss your use cases and get expert advice
- Pick up exclusive k0s swag!

Many of our core maintainers will be attending throughout the conference. Whether you're an existing k0s user or curious about getting started, we'd love to connect with you. Stop by the booth or catch us at the hallway track!

Can't make it to Amsterdam? Join us online through our community channels below.

---

## Get Started with k0s 1.35

Ready to try k0s 1.35? Here's how to get started:

**Download k0s 1.35:**
- [GitHub Releases](https://github.com/k0sproject/k0s/releases/tag/v1.35.1+k0s.0)
- Install script: `curl -sSLf https://get.k0s.sh | sudo sh`

**Documentation:**
- [k0s Documentation](https://docs.k0sproject.io/)
- [Quick Start Guide](https://docs.k0sproject.io/stable/install/)
- [Windows Node Setup](https://docs.k0sproject.io/stable/examples/windows/)

**Join the Community:**
- [GitHub Discussions](https://github.com/k0sproject/k0s/discussions)
- [Slack Channel](https://kubernetes.slack.com/archives/C07VAPJUECS)
- [Community Office Hours](https://docs.k0sproject.io/stable/#community-hours)

---

k0s 1.35 demonstrates our continued commitment to providing a production-ready, batteries-included Kubernetes distribution that's simple to install, operate, and maintain. Whether you're running Windows workloads, need enhanced security compliance, or want the latest Kubernetes features, k0s 1.35 has you covered.

Happy clustering!
