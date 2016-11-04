import { createInstanceofPredicate } from '../utils/utils';

// temporary skeleton of class to make derivation.ts work
export class ComputedValue
{


} // class ComputedValue


export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);