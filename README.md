es-dts-gen
==========

Generates TypeScript definition files from the index mappings of Elasticsearch.

# How to use

```bash
# Install
npm i git+ssh://git@github.com/legalscape/es-dts-gen.git

# Run
es-dts-gen \
  --node http://localhost:9200/ \
  --destination types/es/
```
