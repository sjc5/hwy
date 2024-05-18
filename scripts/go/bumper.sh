#!/bin/bash

# To run this script, make sure you have Git and Go installed, and that you've made it executable (`chmod +x ./path-to-this-script`)

# Ask for confirmation
printf "\033[0;34mhave you pushed your code? \033[0m"
read -p "(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "aborted. go commit and push your changes, then come back"
    exit 1
fi

current_tag=$(git describe --tags --abbrev=0)

if [ -z "$current_tag" ]; then 
    echo "no existing tags found. get started by running:"
    printf "\`\`\`sh\n\033[0;34mgit tag v0.0.1\ngit push origin v0.0.1\nGOPROXY=proxy.golang.org go list -m all\n\033[0m\`\`\`\n"
    echo "aborted"
    exit 1
else
    echo "current tag: $current_tag"
fi

# Ask for new tag
printf "\033[0;34mwhat is the new version? \033[0m"
read -p "v" -r
bumped_version="v$REPLY"

# Show new tag
printf "Result: \033[0;31m$current_tag\033[0m"
printf "  -->  "
printf "\033[0;32m$bumped_version\033[0m\n"

# Ask for confirmation
printf "\033[0;34mis this correct? \033[0m"
read -p "(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "aborted"
    exit 1
fi

# Ask again if you want to push the tag to git
printf "\033[0;34mapply tag \033[0;32m$bumped_version\033[0;34m and push to git? \033[0m"
read -p "(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "aborted"
    exit 1
fi

echo "creating new tag"
git tag $bumped_version
if [ $? -ne 0 ]; then
    echo "tag creation failed"
    exit 1
fi

echo "pushing new tag"
git push origin $bumped_version
if [ $? -ne 0 ]; then
    echo "push failed"
    exit 1
fi

echo "informing go proxy"
GOPROXY=proxy.golang.org go list -m all
if [ $? -ne 0 ]; then
    echo "go proxy update failed"
    exit 1
fi
