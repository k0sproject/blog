---
title: "k0smotron v0.7.0 released"
author: "Jussi Nummelin"
date: 2023-10-17T09:42:13.324Z
lastmod: 2025-09-16T16:26:58+02:00
aliases:
    - "/k0smotron-v0-7-0-released-807d9954f332"
tags: ["k0s", "kubernetes", "cluster API", "containers"]
cover:
  image: 1.png
---

**Team k0s proudly presents: k0smotron v0.7.0.**

This release highlights two new features: client connection tunneling and the new ClusterAPI provider for “remote machines.”

### Remote machine CAPI provider, a.k.a ‘k0smotron Anywhere’

ClusterAPI is a Kubernetes sub-project working to provide Kubernetes-native, declarative means for provisioning, upgrading, and operating multiple clusters on various infrastructures. One of the tenets of CAPI is that it can be easily used with cloud providers and other infrastructure that is API-powered. However, there are a lot of use cases where infrastructure is not API-powered (think: bare metal servers, IoT devices, etc.). In many of these, it doesn’t make sense to invest resources into making the infrastructure API powered.

There are some CAPI providers that can work with bare metal infrastructure, but all of them require some other components — adding complexity and potentially cost

One of the promises of k0s, the Kubernetes distro that powers k0smotron-managed clusters, is that it runs anywhere. So we started to look into how we could enable k0smotron clusters even in the simplest of infrastructures. What we mean by that is that k0smotron should be able to create and manage clusters and infrastructure admins should not need to run ANY additional tooling to make this possible.

When thinking about this, we remembered the success of our existing [k0sctl tool](https://github.com/k0sproject/k0sctl). For those of you who have not used k0sctl, it’s a tool that can provision and manage a single cluster via yaml configuration. Essentially, you need to provide addresses and SSH credentials for each host you want to set up as part of the cluster. k0sctl connects to the hosts using SSH and orchestrates the whole cluster setup.

{{<gist jnummelin 704e23940743da3bb5cff485f3b8cc69 k0sctl.yaml>}}

**Enter `RemoteMachines`**

A RemoteMachine is a machine that can be provisioned remotely via SSH. k0smotron now controls the process of bootstrapping this kind of minimal node. Like in any other Cluster API provider, the scope for a machine controller is very limited. They “only” need to provision the machine using a bootstrap provider generated cloud-init configuration. So in the case of `RemoteMachine` controller, it simply does the following:

*   Wait to see the bootstrap cloud-init secret for the machine
*   Connect to the machine via SSH
*   Execute the cloud-init steps via SSH

Let’s see an example:

{{<gist jnummelin 51d455e61525fc009524a74ddaaf1212 remote-machine.yaml>}}

So what you need to configure for your RemoteMachine is the address to connect to, the username, and which SSH key to use — via a Kubernetes secret, for security. As simple as that.

Of course, with RemoteMachines you cannot reap the full benefits of ClusterAPI. Things like automated updates via MachineDeployment are not possible. But what it does enable is, for example, managing your on-premise bare metal nodes via Cluster API. How cool is that!?

### Client connection tunneling

In the previous k0smotron release, we introduced a control plane provider to also run the control plane using CAPI Machines. This enables you to use CAPI to provision more traditional clusters where both control and worker planes run on CAPX provider-managed infrastructure.

What if the infrastructure to run the Machines can’t be connected to directly by cluster admins? How can cluster admins connect to k0smotron child clusters with tools like kubectl and Lens?

For this use case, we’ve enabled tunneling configuration. What this does is set up a tunnel between the child cluster and management cluster in a way that can be used by clients. In the end, clients connect to a tunnel endpoint on the management cluster and via that, can access the child cluster’s API.

Read more in the k0smotron [docs](https://docs.k0smotron.io/stable/capi-controlplane-bootstrap/#client-connection-tunneling).

### User survey

In case you’ve missed it, we launched a k0s [user survey](https://medium.com/k0sproject/help-shape-the-future-of-k0s-kubernetes-participate-in-our-2023-users-survey-9549d3a72e87?sk=f432e56b6bee4525b45b6141ca26c8ec) a couple weeks ago. By answering this survey, you’ll help us prioritise features that mean the most to YOU, and in general, you’ll help us to shape the future of k0s and k0smotron.

