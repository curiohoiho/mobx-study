import { globalState } from '../core/globalstate';
import { isObservableArray } from '../types/observableArray';


export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);


export interface Lambda 
{
  () : void;
  name? : string;
}


export function getNextId()
{
  return ++globalState.mobxGuid;

} // getNextId()


export function invariant(check: boolean, message: string, thing? : any) : void
{
  if (!check)
  {
    throw new Error("[mobx] Invariant failed: " + message + (thing ? ` in '${thing}'` :  ""));
  }

} // invariant()


const deprecatedMessages = [];
export function deprecated(msg: string) : void 
{
  // if the msg already exists in the array
  if (deprecatedMessages.indexOf(msg) !== -1)
  {
    return;
  }

  deprecatedMessages.push(msg);
  console.error("[mobx] Deprecated: " + msg);

} // deprecated()


/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda
{
  let invoked = false;

  return function() {
    if (invoked) 
      return;
    invoked = true;
    return func.apply(this, arguments);
  }; // return 

} // once()


export const noop = () => {};


export function unique<T>(list: T[]): T[]
{
  const res: T[] = [];

  // see if the item in the list is already in res - if not, push it on 
  list.forEach( item => {
    if (res.indexOf(item) === -1)
      res.push(item);
  }); // forEach

  return res;

} // unique()


export function joinStrings(
  things: string[],
  limit: number = 100,
  separator = " - "
  ) : string
{
  if (!things)
    return "";
  
  const ay_sliced = things.slice(0, limit);
  
  return `${ay_sliced.join(separator)}${things.length > limit ? " (... and " + (things.length - limit) + " more)" : ""}`; 

} // joinStrings()


export function isObject(value: any): boolean
{
  return value !== null && typeof value === "object";
}


export function isPlainObject(value): boolean
{
  if (value === null || typeof value !== "object")
    return false;

  const proto = Object.getPrototypeOf(value);

  // check if there is a prototype chain for this "value" of type object;
  // or if it's a plain, flat object.
  return proto === Object.prototype || proto === null;

} // isPlainObject()


export function objectAssign(...objs: Object[]): Object
{

} // objectAssign()
