#!/bin/sh
cross-env NODE_ENV=development hwy-build && cross-env NODE_ENV=development nodemon --watch .dev/refresh.txt