import { invariant, addHiddenFinalProp } from './utils';

// inspired by https://github.com/leebyron/iterall/

declare var Symbol;


function iteratorSymbol() : string 
{
  // @todo: return value isn't clear: bool and string?
  return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator"; 
}


export const IS_ITERATING_MARKER: string = "__$$iterating";


/** just one function, which returns an object */
export interface Iterator<T>
{
  next(): {
    done: boolean;
    value?: T;
  };
}


/** adds a "next" property to an array to turn it into an iterator */
export function arrayAsIterator<T>(a_array: T[]): T[] & Iterator<T>
{
  // mw: TODO: this should be removed in the next major version of MobX
	// returning an array for entries(), values() etc for maps was a 
  // mis-interpretation of the specs..

  invariant(a_array[IS_ITERATING_MARKER] !== true, "Illegal state: cannot recycle array as iterator");
  addHiddenFinalProp(a_array, IS_ITERATING_MARKER, true);

  let idx: number = -1;
  addHiddenFinalProp(
    a_array,
    "next",
    function next() {
      idx++;
      return {
        done: idx >= this.length,
        value: idx < this.length ? this[idx] : undefined // Option: maybe, nothing 
      };
    } // next()
  );

  return a_array as any;

} // arrayAsIterator()


export function declareIterator<T>(protoType, iteratorFactory: () => Iterator<T>)
{
  addHiddenFinalProp(protoType, iteratorSymbol(), iteratorFactory);

} // declareIterator()
