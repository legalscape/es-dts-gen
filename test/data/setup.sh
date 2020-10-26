#!/usr/bin/env bash

HOST='localhost:9299'
INDEX_NAMES=('index-test-1' 'index-test-2')

for index_name in "${INDEX_NAMES[@]}"
do
  base_url="${HOST}/${index_name}"

  printf "[${index_name}] Deleting index... "
  curl -X DELETE "${base_url}"

  printf "\n[${index_name}] Creating index... "
  curl -X PUT -H 'content-type: application/json' "${base_url}" --data "@test/data/definition-${index_name}.json"

  count=1

  jq -c '.[]'  test/data/data-${index_name}.json | while read line
  do
    printf "\n[${index_name}:${count}] Indexing document... "
    curl -X PUT -H 'content-type: application/json' "${base_url}/_create/${count}" --data "${line}"
    ((count++))
  done

  printf "\n[${index_name}] Done.\n"
done
