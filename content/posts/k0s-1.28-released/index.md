---
title: "k0s 1.28 released"
author: "Jussi Nummelin"
date: 2023-10-11T08:24:57.699Z
lastmod: 2025-09-16T16:26:56+02:00
aliases:
    - "/k0s-1-28-released-f48e50677ab3"
tags: ["k0s", "kubernetes", "cloud native", "DevOps", "orchestration"]
cover:
  image: 1.jpg
  caption: Photo by [Ian Schneider](https://unsplash.com/@goian?utm_source=medium&amp;utm_medium=referral) on [Unsplash](https://unsplash.com?utm_source=medium&amp;utm_medium=referral)
---

**Team k0s proudly presents: k0s 1.28 with Kubernetes 1.28 built in.**

Of course, the biggest thing in this brand-new version 1.28 of k0s is support for [1.28 Kubernetes](https://kubernetes.io/blog/2023/08/15/kubernetes-v1-28-release/), a.k.a Planternetes.

But as per usual, the team has not been just working on updating the embedded Kubernetes components. We’ve also packed in some noteworthy new features and fixes. In this post, we dive into a few of the more exciting new features and enhancements in version 1.28 of k0s.

### Updated components

*   Kubernetes: 1.28.2
*   ContainerD: 1.7.6
*   RunC: 1.1.9
*   Etcd: 3.5.9
*   Kine: 0.10.3
*   Konnectivity: 0.1.4
*   Kube-router: 1.6.0
*   Calico: 3.26.1
*   CoreDNS: 1.11.1

### Enhanced k0s autopilot

k0s autopilot, bundled initially into our earlier 1.24 release, lets operators easily keep clusters up-to-date by applying an update `Plan` object. The update `Plan` contains all the information needed to perform an automated update, orchestrated by the cluster itself.

Building on top of this, 1.28 now supports scheduled updates that follow a specific update channel. So how does this work?

```yaml
apiVersion: autopilot.k0sproject.io/v1beta2
kind: UpdateConfig
metadata:
  name: example
  namespace: default
spec:
  channel: latest
  updateServer: https://updates.k0sproject.io/
  upgradeStrategy:
    type: periodic
    periodic:
      # The folowing fields configures updates to happen only on Tue or Wed at 13:00-15:00
      days: [Tuesday,Wednesday]
      startTime: "13:00"
      length: 2h
  planSpec: # This defines the plan to be created IF there are updates available
```

The general idea is that each minor version will have its own dedicated update channel. That lets you very easily keep up-to-date with frequent patch updates — updates that both upstream Kubernetes and k0s provide. Once you’re ready to hop on a newer minor release, just update the `UpdateConfig` to follow a different channel. For those who like living on the edge, we’re also providing channels for beta releases and a `latest` channel.

To keep things easy, the update server “protocol” is very simple. Each channel only has a simple `index.yaml` that contains info about the latest version that __ channel provides. This enables, for example, building your own update servers for airgapped environments. A reference implementation can be found at [https://github.com/k0sproject/update](https://github.com/k0sproject/update).

### ipset and kernel version incompatibility

As some of you might remember, about a year ago, team k0s [uncovered](https://www.mirantis.com/blog/networking-problems-after-installing-kubernetes-1-25-or-after-upgrading-your-host-os-this-might-be-your-problem) an `iptables` version incompatibility bug. Then a few weeks ago, some of our integration tests started to fail unexpectedly when running on the newer 6.2 Linux kernel. While we started to debug and triage those tests, we pretty soon realized that we’d again stumbled over something very similar to the iptables saga.

In the Linux kernel, there’s a framework called `ipset` which manages sets of addresses within the kernel. Those sets can be used for lightning fast matching on rules. Naturally, in the world of Kubernetes, there are a few things that interface with `ipset`, like kube-proxy and some CNI providers.

As with Kubernetes, and containers in general, the main philosophy is that each container comes with all the tools and libraries they need bundled within the container image. While that works pretty well when considering run-of-the-mill applications, it poses some challenges for system level things. In this particular case, kube-proxy bundles one version within the image and a CNI provider (Calico in our case) might bundle some other version. Why is this a problem? Well, in most cases it is not and should not be as the Linux kernel has very strong backwards compatibility guarantees. However, on kernels &gt;= 6.2, there’s a new bitmask parameter for `ipset`, which newer ipset versions support and use, but which older versions don’t know how cope with. This leads to a failure, with the error message:

```
Kernel and userspace incompatible: settype hash:ip with revision 6 not supported by userspace.
```

The kube-proxy image was shipping `ipset` v7.17, whereas the calico-node image was shipping `ipset` v7.15. That fails on newer kernels, if kube-proxy uses IPVS. Now rules set up with v7.17 — rules that utilize the new bitmask parameter — fail on loading by the older v7.15 version. 💥

The fix in itself is easy for k0s. We _just_ (okay, harder than it looks) need to ensure that ALL system components bundle the same compatible version of ipset. But this raises the question: how can system admins ensure all low-level kernel and user space tooling IS actually compatible between all system components? The longer (and painful)answer is: by testing EVERY single update — k0s, Kubernetes upstream, Linux kernel, or other components should be rigorously tested BEFORE hitting a production environment.

The short (and painless) answer is by using a well-tested Kubernetes distro like k0s. :) We believe sysadmins should not need to worry about stuff like this.

All this brings up one other major thing the team has been working on in the scope of the 1.28 release.

### Extended OS testing matrix

As you know, one of the promises of k0s is that it runs on ANY Linux setup. As k0s bundles in ALL the needed dependencies, there’s really nothing a cluster admin needs to set up as a prerequisite before running k0s. But how can we really be sure that is the case? With rigorous testing.

We’ve now extended our OS testing matrix to cover the following Linux distros and versions:

*   Alpine: 3.17
*   Centos: 7, 8 and 9
*   Debian: 10, 11 and 12
*   Fedora CoreOS: 38
*   Fedora: 38
*   Flatcar
*   Oracle: 7.9, 8.7, 9.1
*   RHEL: 7, 8 and 9
*   Rocky: 8 and 9
*   Ubuntu: 20.04, 22.04 and 23.04

Not only do we test different OS versions, but we also test different configurations of k0s. The matrix “dimensions” also cover different CNI providers and different kube-proxy modes (iptables vs. IPVS). So the total number of permutations we test is going up fast: right now, we test 84. We’re also planning to add tests for arm64, which will double the amount of permutations permutations.

For each OS and configuration combination we run the full Kubernetes conformance test suite. That gives us pretty good guarantees that everything is working on that combination as expected.

As you see, we take our promise of “runs anywhere” very seriously.

### SBOM

Starting with the 1.28 release, we now build a full signed SBOM of k0s build artifacts. This has several benefits to the users:

*   **Enhanced Security**: By providing a full signed SBOM, k0s enables users to verify the authenticity of their Kubernetes distribution, reducing the risk of using tampered or malicious components.
*   **Transparency**: Users gain insight into the components and dependencies included in the k0s distribution, improving transparency and aiding in vulnerability management.
*   **Compliance**: SBOMs are valuable for organizations striving to meet compliance requirements, such as those outlined by regulatory bodies or internal policies.

Going forward we’re also planning to sign ALL the build artifacts to further enhance the security of the build pipeline.

### User survey

In case you’ve missed it, we launched a k0s [user survey](https://medium.com/k0sproject/help-shape-the-future-of-k0s-kubernetes-participate-in-our-2023-users-survey-9549d3a72e87?source=friends_link&amp;sk=f432e56b6bee4525b45b6141ca26c8ec) last week. By answering this survey, you’ll help us prioritize features that mean the most to YOU, and in general, you’ll help us to shape the future of k0s.

