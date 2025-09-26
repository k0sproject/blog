---
title: "K0smotron 1.7.0 Release: Federated Hosted Control Planes"
date: 2025-09-26T09:00:00Z
author: "Adrian Pedriza"
tags: ["k0smotron", "kubernetes", "cluster API", "k0s", "containers"]
draft: true
cover:
  image: "1.png"
---

It’s been a while since our last k0smotron update, but the project has been evolving at full speed. Over the past few months, we’ve worked on strengthening k0smotron both as a standalone solution and as a first-class citizen within Cluster API. Along the way, we’ve also expanded k0smotron’s own API so it can support a wider range of use cases.

One example is the new `customUserData` field, which gives you direct control over how your VMs are prepared to run k0s. This makes it possible to adapt cluster startup to very specific requirements. And this is only the beginning, support for Ignition as an alternative bootstrapping method is planned for the next minor release, further extending bootstrap configuration flexibility.

At the same time, we’ve been refining the overall developer and operator experience: improving extensibility, eliminating inconsistencies, and smoothing out the rough edges that show up across different environments. Much of this work is behind the scenes, but it makes k0smotron more stable and easier to work with in the long run.

Finally, we’re excited to announce support for **Federated Hosted Control Planes**, which adds an entirely new layer of adaptability for multi-cluster scenarios. We’ll take a closer look at this feature later in the post.

## What’s new in K0smotron 1.7.0

This release introduces Federated Hosted Control Planes, a major new capability, along with a set of improvements in provisioning, reliability, and documentation.

**New Feature**
- **Federated HCP**: a significant addition that allows hosting and managing control planes across multiple clusters in a federated manner, unlocking new scalability and flexibility scenarios.

**Maintenance & Reliability**: 
- General fixes and ongoing project housekeeping to maintain stability.
- Switched default registry from `docker.io` to `quay.io` to avoid hitting registry rate limits.
  
**Provisioning & Cluster Management**
- Updated machine naming strategy, now consistent with conventions followed by most CAPI providers.
- Smarter bootstrap configuration, adapting automatically to the detected k0s version.
- Improved debugging for remote machine provisioning, making troubleshooting more efficient.

**Documentation Updates**
- Adjusted examples throughout the docs to keep them up to date.
- Expanded documentation on the release process for better transparency.


See the [changelog](https://github.com/k0sproject/k0smotron/releases/tag/v1.7.0) for a detailed breakdown of everything included in this release.

## What is a Federated Hosted Control Plane?  

A **Hosted Control Plane (HCP)** in k0smotron means that the Kubernetes control plane doesn’t need its own dedicated machines. Instead, it runs as pods inside a Kubernetes cluster. Until now, those control plane pods were always scheduled in the **management cluster**, living side by side with the k0smotron controller itself.  

The idea of a **Federated HCP** takes this one step further. Instead of being tied to the management cluster, the control plane pods can now be deployed in an **external cluster**. The k0smotron controller is still in charge of managing them, but it no longer has to host them directly.  

This shift brings a new level of versatility: the management cluster can remain lean and dedicated to orchestration, while the control planes themselves can live wherever it makes the most sense, closer to workload nodes, inside a regulated environment, or simply spread across clusters for higher resilience. In short, federation decouples *where* control planes run from *where* they are managed, opening up new scenarios for scaling, compliance, and availability.

### Why Federated HCP Matters

This change is not just architectural. It brings very practical advantages:  

- **Better scalability** as the load of hosting control planes can be distributed rather than centralized.
- **Compliance-friendly** setups where control planes stay inside clusters that meet regulatory or security requirements, while the management cluster remains clean.
- **Higher resilience** since workload clusters no longer have any physical dependency on the management cluster. Even if the management cluster fails or connectivity to it is slow or unstable, federated control planes keep running independently, ensuring the workload clusters stay operational.


Of course, federation isn’t always required. For smaller or simpler environments, running control planes directly in the management cluster can still be the most straightforward and efficient choice. But when you need the extra flexibility, Federated HCP unlocks scenarios that go far beyond these examples. We’re confident users will find even more ways to take advantage of it.


### How to use it

Deploying control planes as pods in a cluster other than the management cluster is straightforward with k0smotron. The only change you need is to reference a Kubernetes Secret that contains a `kubeconfig` for the external cluster where the control planes should run.

```yaml
apiVersion: k0smotron.io/v1beta1
kind: Cluster
metadata:
    name: my-k0smotron
spec:
    kubeconfigRef:
        name: my-external-cluster-kubeconfig
        namespace: some-namespace
        key: secret-key-for-kubeconfig
```

In this example, the cluster spec points to a `kubeconfig` stored in a Secret. The k0smotron controller uses that configuration to connect to the target cluster and deploy the control plane pods there. 

👉 The only requirement is that the `kubeconfig` provides the controller with enough permissions to create the necessary resources and that the external cluster is reachable from the management cluster where k0smotron is running.

## Wrapping up

K0smotron 1.7.0 is a release focused on extending flexibility and strengthening the foundations of the project. With Federated Hosted Control Planes, smarter provisioning, and tighter integration with Cluster API, we’re making it easier to run Kubernetes clusters in ways that adapt to real world needs, from multi-cloud setups to edge deployments and everything in between.

We’re excited about this release, and even more about what’s coming next. As always, we’d love feedback from the community, so give the new features a try and let us know what you think! 🚀