# Require an operator-installed MongoDB extension

The v1 ZIP requires `ext-mongodb` but does not bundle platform-specific extension binaries. Shipping binaries for differing PHP versions and local platforms risks incompatibility and increases archive size. A pre-flight checker detects the missing extension and guides the operator through installing or enabling it.
