import { once, ILambda, deprecated } from './utils';

// not clear to me
export type ISimpleEventListener = {
  (...data: any[]): void 
}


export class SimpleEventEmitter
{
  listeners: ISimpleEventListener[] = [];

  constructor() 
  {
    deprecated("extras.SimpleEventEmitter is deprecated and will be removed in the next major release");
  }


  emit(...data: any[]);
  emit()
  {
    const listeners = this.listeners.slice();
    
    // each listener is a function, so call it with this function's arguments
    for (let i = 0, l = listeners.length; i < l; i++)
    {
      listeners[i].apply(null, arguments);
    }

  } // emit()


  on(listener: ISimpleEventListener) : ILambda
  {
    this.listeners.push(listener);

    return once( () => {
    
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1)
        this.listeners.splice(idx, 1);
    
    }); // return 

  } // on()


  once (listener: ISimpleEventListener) : ILambda
  {
    const subscription = this.on(function() {
      subscription();
      listener.apply(this, arguments);
    });

    return subscription;

  } // once()

} // class SimpleEventEmitter

