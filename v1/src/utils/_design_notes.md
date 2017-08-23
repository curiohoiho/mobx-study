# Notes on the porting of the '/src/utils' folder

current file working on: utils.ts

current status of porting this folder: just starting 

most recent sync from original: Jan 17, 2017, version 3.0
previous sync:


#  This first list shows source files ported, listed in order ported, as there are dependencies among them:

- utils.ts - 98% completed, just one import statement left

- decorators.ts - completed

- iterable.ts - completed, and partially deprecated

-  simpleeventemitter.ts  - completed, and deprecated



# This 2nd list gives notes on all the files, listed alphabetically by file:

## utils.ts - 98% complete
- check the to-dos

Dependencies:

/core/globalstate.ts


Circular dependencies: 

- /types/observablearray.ts 


Waiting on:

/core/globalstate.ts
/types/observablearray.ts



# to-dos & notes

1. 



