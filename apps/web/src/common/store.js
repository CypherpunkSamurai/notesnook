import produce, { immerable, setAutoFreeze } from "immer";
import create from "zustand";
setAutoFreeze(false);
function immer(config) {
  return function (set, get, api) {
    const obj = config(
      (fn) =>
        set(() =>
          produce(get(), (state) => {
            fn(state);
          })
        ),
      get,
      api
    );
    obj[immerable] = true;
    return obj;
  };
}

/**
 * @returns {[import("zustand").UseStore<any>, any]}
 */
function createStore(store) {
  const [useStore, api] = create(immer(store.new.bind(store)));
  return [useStore, api.getState()];
}

export default createStore;