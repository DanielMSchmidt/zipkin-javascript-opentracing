[![wercker status](https://app.wercker.com/status/3f93bfdfe9b3d664fd8f9f6f4aa3132f/m/ "wercker status")](https://app.wercker.com/project/byKey/3f93bfdfe9b3d664fd8f9f6f4aa3132f)
# Zipkin-Javascript-Opentracing

## Installation

## Usage
Please see the examples in the `examples/` directory.

## Limitations

### injecting and ejecting

We currently only support HTTP Headers. If you need your own mechanism, feel free to do a PR.

### Flags

They are currently not supported, feel free to do a PR.


### Follows From (zipkin)

FollowsFrom is not supported by openTracing, as far as I understand it.

### Tags

Zipkin doesn't distinguish between logs and tags.

### Additional options for starting a span

We need to know if this is a server or client to set the right annotations.
Therefore we need the kind attribute to be set.
