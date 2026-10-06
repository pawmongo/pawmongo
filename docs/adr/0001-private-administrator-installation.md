# Start with a private single-administrator installation

phpMongo v1 targets a private installation operated by one administrator, who must enter a separate phpMongo master password before supplying any MongoDB credentials. A shared team tool or public service for unrelated users would introduce additional identity and isolation boundaries; those are outside the initial product model. The agreed configuration bootstrap and session lifecycle are described in [v1 scope](../v1-scope.md).
