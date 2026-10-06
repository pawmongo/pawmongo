# Exclude system databases from v1 browsing

The read-only v1 product excludes MongoDB's `admin`, `local`, and `config` databases at the backend boundary, even when supplied credentials permit access. This deliberately limits administration breadth rather than merely hiding navigation entries. An internal connection-verification ping is separate from browsing permission.
