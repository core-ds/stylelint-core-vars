#!/usr/bin/env bash

NODE_VERSION_FILE=.node-version
NODE_VERSION='18'

if [ "$NODE_VERSION" = "" ] && [ -f $NODE_VERSION_FILE ]; then
    NODE_VERSION="$(cat $NODE_VERSION_FILE)"
fi

echo $NODE_VERSION
