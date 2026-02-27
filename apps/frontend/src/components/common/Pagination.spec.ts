import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Pagination from "./Pagination.vue";

describe("Pagination", () => {
  const defaultProps = {
    page: 0,
    size: 20,
    totalElements: 100,
    totalPages: 5,
    hasNext: true,
    hasPrev: false,
  };

  it("renders total items count", () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    expect(wrapper.text()).toContain("100 itens");
  });

  it("renders page info", () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    expect(wrapper.text()).toContain("Página 1 de 5");
  });

  it("renders size selector with default options", () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    const select = wrapper.find(".size-select");
    expect(select.exists()).toBe(true);
    const options = select.findAll("option");
    expect(options.map((o) => o.element.value)).toEqual(["20", "50", "100"]);
  });

  it("emits update:page when Anterior clicked and hasPrev=true", async () => {
    const wrapper = mount(Pagination, {
      props: { ...defaultProps, page: 1, hasPrev: true },
    });
    const buttons = wrapper.findAll(".btn");
    const prevBtn = buttons.find((b) => b.text() === "Anterior");
    expect(prevBtn?.element.hasAttribute("disabled")).toBeFalsy();
    await prevBtn?.trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[0]]);
  });

  it("disables Anterior when hasPrev=false", () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    const buttons = wrapper.findAll(".btn");
    const prevBtn = buttons.find((b) => b.text() === "Anterior");
    expect(prevBtn?.element.hasAttribute("disabled")).toBe(true);
  });

  it("emits update:page when Próxima clicked and hasNext=true", async () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    const buttons = wrapper.findAll(".btn");
    const nextBtn = buttons.find((b) => b.text() === "Próxima");
    expect(nextBtn?.element.hasAttribute("disabled")).toBeFalsy();
    await nextBtn?.trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[1]]);
  });

  it("disables Próxima when hasNext=false", () => {
    const wrapper = mount(Pagination, {
      props: { ...defaultProps, hasNext: false },
    });
    const buttons = wrapper.findAll(".btn");
    const nextBtn = buttons.find((b) => b.text() === "Próxima");
    expect(nextBtn?.element.hasAttribute("disabled")).toBe(true);
  });

  it("emits update:size when size select changes", async () => {
    const wrapper = mount(Pagination, { props: defaultProps });
    await wrapper.find(".size-select").setValue("50");
    expect(wrapper.emitted("update:size")).toEqual([[50]]);
  });

  it("uses custom sizes when provided", () => {
    const wrapper = mount(Pagination, {
      props: { ...defaultProps, sizes: [10, 25] },
    });
    const options = wrapper.find(".size-select").findAll("option");
    expect(options.map((o) => o.element.value)).toEqual(["10", "25"]);
  });

  it("shows page 1 of 1 when totalPages is 0", () => {
    const wrapper = mount(Pagination, {
      props: { ...defaultProps, totalPages: 0, totalElements: 0 },
    });
    expect(wrapper.text()).toContain("Página 1 de 1");
  });
});
