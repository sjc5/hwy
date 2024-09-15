#!/bin/bash

blue_start="\033[0;34m"
red_start="\033[0;31m"
green_start="\033[0;32m"
color_end="\033[0m"

# Ask for confirmation
printf "${blue_start}have you pushed your code? ${color_end}"
read -p "(y/n) " -n 1 -r
echo
if [[ ! ${REPLY} =~ ^[Yy]$ ]]
then
    echo "aborted. go commit and push your changes, then come back"
    exit 1
fi

current_tag=$(git describe --tags --abbrev=0)
if [ -z "${current_tag}" ]; then
    echo "No existing tags found. Get started by running:"
		echo "\`\`\`sh"
    printf "${blue_start}git tag v0.0.1\n"
    echo "git push origin v0.0.1"
    printf "GOPROXY=proxy.golang.org go list -m all${color_end}\n"
		echo "\`\`\`"
    echo "Aborted"
    exit 1
else
    echo "current tag: ${current_tag}"
fi

# Ask for new tag
printf "${blue_start}what is the new version? ${color_end}"
read -p "v" -r
bumped_version="v${REPLY}"

# Show new tag
printf "Result: ${red_start}${current_tag}${color_end}"
printf "  -->  "
printf "${green_start}${bumped_version}${color_end}\n"

# Ask for confirmation
printf "${blue_start}is this correct? ${color_end}"
read -p "(y/n) " -n 1 -r
echo
if [[ ! ${REPLY} =~ ^[Yy]$ ]]
then
    echo "aborted"
    exit 1
fi

# Ask again if you want to push the tag to git
printf "${blue_start}apply tag ${green_start}${bumped_version}${blue_start} and push to git? ${color_end}"
read -p "(y/n) " -n 1 -r
echo
if [[ ! ${REPLY} =~ ^[Yy]$ ]]
then
    echo "aborted"
    exit 1
fi

echo "creating new tag"
git tag ${bumped_version}
if [ $? -ne 0 ]; then
    echo "tag creation failed"
    exit 1
fi

echo "pushing new tag"
git push origin ${bumped_version}
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
