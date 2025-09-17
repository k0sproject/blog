---
title: "K0s 1.30 Released"
author: "Jussi Nummelin"
date: 2024-05-13T10:31:12.131Z
lastmod: 2025-09-16T16:27:03+02:00
aliases:
    - "/k0s-1-30-released-b1bbb9f2147a"
tags: ["kubernetes", "k0s", "etcd"]
cover:
  image: 1.webp
---

### New k0s delivers Kubernetes 1.30 (“UWUbernetes”) plus new k0s-only features — including improvements to control plane management, “virtual IPs” (internal LB) out-of-box, and an exciting new Support Insight feature, powered by open source Replicated Troubleshoot

K0s 1.30 just dropped, delivering upstream Kubernetes 1.30 (“UWUbernetes”). Tiny heart fingers to the contributors, and to Team k0s for delivering the cutest Kubernetes ever in an extremely adorable (not to mention usable) form.

Kubernetes 1.30 advanced several enhancements to stable status, and introduces a flock of new features as beta or alpha. Overall, it feels (no surprise to anyone) that Kubernetes is maturing — features promoted with 1.30 include ‘fit and finish’ improvements enhancing basic container security and making things like Horizontal Pod Autoscaler more flexible and usable. For the complete scoop, read the [official release notes](https://kubernetes.io/blog/2024/04/17/kubernetes-v1-30-release/). We’d also like to give a shout-out to OVHCloud developer advocate Aurélie Vache, author/illustrator of [Understanding Kubernetes in a Visual Way](https://www.amazon.com/Understanding-Kubernetes-visual-way-sketchnotes/dp/B0BB619188), who just published an illustrated [guide to the Kubernetes 1.30 changelog](https://dev.to/aurelievache/understanding-kubernetes-part-51-kubernetes-130-changelog-59l7) as unit 51 of her continuing series on [DEV.to](https://kubernetes.io/blog/2024/04/17/kubernetes-v1-30-release/).

### Some Kubernetes 1.30 Highlights

**Pod Scheduling Readiness** (now stable) cuts load on the scheduler when Kubernetes is confronted with scheduling a pod for which resources aren’t yet available. The feature introduces the notion of schedulingGates as part of the pod spec: these can be used (or removed) to control when and how Kubernetes considers the pod for scheduling. The feature can be leveraged, for example, to avoid making Kubernetes try (and fail, at cost of time and resources) to schedule a pod on not-yet-available nodes; or, for another example, to prevent cluster autoscaling from spinning up a new node to host a low-priority workload. In a world where clusters are empowered to self-scale (e.g., with ClusterAPI) in more and more dynamic ways, this seems very important. The feature is also being used in the community to implement quotas, and for security applications.

**HPA based on ContainerResource (vs. pod) metrics** (now stable) lets you trigger Horizontal Pod Autoscaling on metrics returned by a specific container, vs. a pod, giving developers more flexibility in packaging containers in pods while also being able to designate specific containers as performance bottlenecks, and thus as scaling triggers.

**Min domains in PodTopologySpread** (now stable) lets you define the minimum number of domains Cluster Autoscaler will maintain, preventing situations where pods can’t be scheduled because too few domains exist to fulfill requirements stated in PodTopologySpread constraints.

**User namespaces** (now beta) isolates the UIDs and GIDs of containers from the host. This prevents a container running as root from having root access to the host node it’s running on.

**Contextual logging** (now beta) lets you inject context information like service names and transaction IDs into logs, using WithName and WithValues. This is a pretty big step forward in enabling more context-aware observability and clearer insights into how Kubernetes environments and applications are working.

### New Features in k0s 1.30

Two new k0s features — both added in response to user requests — are headlined in this latest k0s release.

**Declarative management of etcd state** overcomes a particular challenge of using k0smotron and ClusterAPI to horizontally scale k0s Kubernetes control planes on virtual machines. For example, you might want to scale down the control plane on a self-scaling k0s cluster running on OpenStack or AWS VMs.

In such a situation, the ClusterAPI controllers run as workloads. And the controller/worker separation architecture of k0s means that these infrastructure controllers can’t access etcd — a control plane element. That’s a problem, because when ClusterAPI wants to get rid of a control plane node, it needs to tell etcd that the node has left the cluster — and can’t. Eventually your etcd dies from trying to deal with ghost members that never boot up.

Declarative management of etcd state routes around the problem by providing a mechanism that lets the ClusterAPI controller (or Terraform, or other tools) tell etcd what’s going on when control plane nodes are added or deleted. Quite cool: the facility even leaves an audit trail of ‘breadcrumbs’ in the config, like timestamps for when nodes leave the cluster.

**Control plane load balancer (aka. “Virtual IPs”)** solves a big challenge when k0s clusters are deployed in environments that don’t provide integrated external load balancing for the Kubernetes API (e.g., vSphere, which has no default facility for load balancing). With control plane load balancer, you give k0s an IP within the local subnet, and k0s sets things up with Keepalived to load-balance traffic to this IP across available controllers. (We examined KubeVIP to provide this functionality, but it didn’t meet all our requirements, some of which are unique to k0s’ architecture.)

This is roughly what KubeVIP does — the difference being that KubeVIP expects to pick up back end addresses for APIservers from the node objects hosting controllers. And k0s, because it runs controller components as bare processes, doesn’t really have controller nodes, per se — so this won’t work. KubeVIP can also only balance one port — whereas k0s needs two ports: one for the Kubernetes API and one port reserved for joining new nodes to the cluster.

### Introducing Support Insight

In the past, raising support issues around k0s could involve a lot of back-and-forth, with Team k0s members saying things like “what do you see when you run this command?” Annoying and time-consuming.

K0s Support Insight, introduced with k0s 1.30, solves this problem. It’s a new way of diagnosing Kubernetes issues, so we can help k0s users solve problems more efficiently.

K0s Support Insight is powered by the open source Troubleshoot project, from the team at Replicated. Check out [the Troubleshoot website](https://troubleshoot.sh/) (especially the animated terminal session videos) and their [GitHub repo](https://github.com/replicatedhq/troubleshoot). We’ve started collaborating (in both directions) with the team at Replicated, and we’re excited to deliver a first taste of the resulting improvements with k0s 1.30.

What’s Troubleshoot? Replicated created the Troubleshoot system to help Kubernetes platform engineers and cloud-native application builders communicate better with their users. Team k0s is adopting their _support-bundle_ component (called with `kubectl support-bundle <URL>`), which downloads a declarative description of data collection and analysis operations. These get run against your cluster with kubectl (without installing anything) and the resulting data model gets saved locally, with all sensitive information (e.g., secrets) redacted. You can review it yourself or upload it to Mirantis (who provide commercial support for k0s) or to Team k0s via GitHub issues (for community support). Experts can then analyze the support bundle locally as if it were your cluster, quickly surfacing issues.

For k0s 1.30, the team has developed a support bundle configuration that efficiently collects every scrap of data, logs, etc., that we might need to solve virtually any problem, or help independent-minded users solve it all by themselves. For details, visit the [k0s docs](https://docs.k0sproject.io/head/support-dump/).

### Try k0s 1.30

If you haven’t tried k0s Kubernetes, it’s a great moment to start. Simple, easy to install and operate on almost anything, from public clouds to datacenter servers to Raspberry Pis and other IoT-scale edge devices. Please visit the [Releases page](https://github.com/k0sproject/k0s/releases) of our GitHub repo, and [check out the docs](https://docs.k0sproject.io/stable/) today!

