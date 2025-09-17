---
title: "k0smotron with full CAPI support"
author: "Jussi Nummelin"
date: 2023-08-30T11:57:39.038Z
lastmod: 2025-09-16T16:26:51+02:00
aliases:
    - "/k0smotron-with-full-capi-support-65b61a571a6b"
tags: ["kubernetes", "cluster API", "k0s", "containers"]
cover:
  image: 1.jpg
  caption: Photo by [Aldebaran S](https://unsplash.com/@aldebarans?utm_source=medium&amp;utm_medium=referral) on [Unsplash](https://unsplash.com?utm_source=medium&amp;utm_medium=referral)
---

Since we’ve [initially launched](https://medium.com/k0sproject/introducing-k0smotron-c2ed6535ddc8) k0smotron in June, team k0s has been busy with working on enhancing k0smotron. Today we’re glad to share that k0smotron now has pretty much full ClusterAPI support built-in.

In k0smotron version 0.4.0, released only couple weeks after the initial k0smotron launch, we already added the basic capability to spin up both the control and worker planes via ClusterAPI.

0.5.0, released in mid July, came with support for `Template` types and thus enabling you to work with `MachineDeployment` etc. ClusterAPI constructs. `MachineDeployments` allows you to easily scale your nodes as it behaves very similarly as normal workload `Deployment`.

Now with the latest 0.6.0 release we’re happy to complete the ClusterAPI support by introducing the “traditional” control plane provider for `Machines` . This allows you to run the child cluster control planes on `Machines`.

Like we said in the initial launch blog:

> we are definitely looking at Cluster API direction of having k0smotron providing the controlplanes for the clusters.

So yes, we’ve been a bit more than looking at it. :)

### ClusterAPI providers

In ClusterAPI there’s many different providers providing various “parts” of the clusters. k0smotron can now acts as the following providers:

#### Controlplane provider — in-cluster

k0smotron can acts as the Control Plane provider in two different modes. Either running the control plane _within_ the management cluster, this being the main use case for k0smotron. This way you can bootstrap the control plane super fast and easy and then attach your worker plane from practically ANY infrastructure. Imagine the use cases this unlocks such as multi cloud clusters, far Edge cluster and so on. The possibilities are pretty much endless.

#### Controlplane provider — out-of-cluster

This is the “traditional” way how ClusterAPI provisions clusters. The control plane of the child cluster is configured on `Machines` provisioned and managed by some ClusterAPI infrastructure provider, AWS for example. In this sceneario k0smotron configures the control plane `Machines` to run as the control plane for the child cluster.

#### Bootstrap provider

Bootstrap provider was the very first provider we implemented on ClusterAPI. It provides the needed configuration to provision worker plane `Machines` via an infrastructure provider. Needless to say, in the scope of k0smotron and k0s it provides the bootstrap config to spin up k0s worker nodes connecting to the control plane provisioned via the control plane provider. It can naturally work with either way the control plane is provisioned, in-cluster or out-of-cluster.

### How can You help?

As you can imagine, k0s team cannot practically test all the different ClusterAPI infrastructure providers out there. While k0smotron does follow the contracts outlined in ClusterAPI itself there can be some details in each infrastructure provider that does not work out of box. Hence we urge you to test k0smotron with your favourite infrastructure (cloud) provider. Check out the k0smotron [docs](https://docs.k0smotron.io) for [ClusterAPI providers](https://docs.k0smotron.io/stable/cluster-api/) to get started.

