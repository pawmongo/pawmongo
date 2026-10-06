# Target local PHP environments first

phpMongo v1.0.0 primarily targets local development packages such as XAMPP, WampServer, MAMP, and local Apache/Nginx installations. Standard shared hosting cannot be the primary target when it blocks the MongoDB extension and outbound database traffic; Docker on a VPS is also not the primary target. Operators install the MongoDB extension themselves and serve only the public document root; implementation must verify the supported platform matrix.
