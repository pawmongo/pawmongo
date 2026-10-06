# Restrict access to loopback by default

The local-development release accepts loopback peers only, with master-password protection still required. Remote deployment requires an explicit `force_local_boundary=false` configuration and HTTPS rather than exposing the panel by default. Deployments behind proxies must configure their trust boundary explicitly.
