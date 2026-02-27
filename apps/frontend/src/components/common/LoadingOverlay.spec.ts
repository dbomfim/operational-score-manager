import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingOverlay from "./LoadingOverlay.vue";

describe("LoadingOverlay", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when show=false", () => {
    mount(LoadingOverlay, { props: { show: false }, attachTo: document.body });
    expect(document.querySelector(".overlay")).toBeNull();
  });

  it("renders overlay when show=true", () => {
    mount(LoadingOverlay, { props: { show: true }, attachTo: document.body });
    expect(document.querySelector(".overlay")).toBeTruthy();
    expect(document.querySelector(".spinner")).toBeTruthy();
  });

  it("renders nothing when show is undefined", () => {
    mount(LoadingOverlay, { props: {}, attachTo: document.body });
    expect(document.querySelector(".overlay")).toBeNull();
  });
});
