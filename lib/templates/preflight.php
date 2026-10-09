<!doctype html><html lang="en"><meta charset="utf-8"><title>PawMongo setup</title>
<h1>PawMongo prerequisites</h1><p>PawMongo requires PHP 8.2+, OpenSSL, and the MongoDB PHP extension 2.5+.</p>
<p>Missing extensions: <?= $missingText ?: 'none' ?>.</p>
<ol><li>Run <code>php --ini</code> and confirm which PHP installation your web server uses.</li>
<li>Install the MongoDB extension matching that PHP version and architecture. Enable <code>extension=mongodb</code> in its php.ini and restart Apache or PHP-FPM.</li>
<li>For XAMPP or WampServer, use the matching official Windows extension build; for MAMP, use its own PHP executable and extension directory.</li>
<li>During development run <code>composer install</code> from <code>lib/</code>. Release ZIPs include vendor dependencies.</li>
<li>Copy the configuration template, set a master password, and serve only <code>lib/public/</code>.</li></ol>
<p><a href="https://www.php.net/manual/en/mongodb.installation.php">Official MongoDB extension installation guide</a></p>
</html>
