# Contributing

## Using Git
1. When pulling from remote repositories use `git pull --rebase`, this will keep our history nicer looking.
1. [How to write commit messages.](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

## Workflow
1. Do your work on a new branch.  We try and keep branches pretty small in scope, with a branch per bite-sized feature or modification.  You shouldn't be working on the same branch for more than a couple of days.
1. Code and its tests should be in the same commit, commits should be atomic (don't try and do several things in it), unit tests should pass between all commits. If there are no prior unit tests for part of the code you're going to change - add them first, then change the code.
1. Push changes to your branch to Github whenever you want.  Sooner rather than later - people may give you feedback on your work in progress.
1. Before making a Pull Request make sure to run unit tests locally and that they pass.
1. When you're ready to have someone else review your code, push your latest changes to your branch, and create a pull request on Github to merge to master. Add a @mention to the end of your pull request to notify the developer you'd like to review your code.
1. Have them review your code. They should make any comments about style/bugs/design/etc on Github, so everyone else can see and contribute.
1. Make any changes based on their comments, and push the changes to your branch on Github. It makes it much easier on the reviewer if you make each change in response to one of their comments in a separate commit, and reply to their comment with the hash of the commit that fixed their concern (github will automatically turn the hash into a link to that commit).
1. When the other developer is satisfied, they'll reply with "LGTM", which stands for "Looks good to me!". That means that they agree your code is high quality and safe to merge to master.
1. When you're ready to merge, make sure all the unit tests pass on your branch, and then use the merge button on the pull request in Github.  Please don't merge manually, we've found that's more error prone. If Github won't allow you to merge, then manually merge master into your branch, run the unit tests again, and push to github again. You should then be given the green merge button.
1. Once you've successfully merged to master, click the "Delete branch" button.
1. **Never leave master broken.**

## Coding Style
* Avoid abbreviations.
* Use PEP-8 style guidelines, if not otherwise outlined here.
* Use 2-space indents (no tabs).
* Maximum line length is 100 characters.
* Trailing whitespaces should be trimmed in each line.
* TODO comments should indicate the responsible person (e.g. `// TODO(john): comment goes here`)
* For the sake of simplicity, we're using only TODO comments, no FIXMEs, etc.
* For everything we follow [Solidity's Style Guide.](https://solidity.readthedocs.io/en/latest/style-guide.html)
