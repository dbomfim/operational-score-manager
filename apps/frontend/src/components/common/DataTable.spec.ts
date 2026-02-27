import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DataTable from "./DataTable.vue";

describe("DataTable", () => {
  const columns = [
    { key: "name", label: "Nome" },
    { key: "email", label: "E-mail" },
  ];

  it("renders column headers", () => {
    const wrapper = mount(DataTable, {
      props: { columns, data: [] },
    });
    expect(wrapper.text()).toContain("Nome");
    expect(wrapper.text()).toContain("E-mail");
  });

  it("shows loading state when loading=true", () => {
    const wrapper = mount(DataTable, {
      props: { columns, data: [], loading: true },
    });
    expect(wrapper.text()).toContain("Carregando...");
  });

  it("shows empty message when data is empty and not loading", () => {
    const wrapper = mount(DataTable, {
      props: { columns, data: [] },
    });
    expect(wrapper.text()).toContain("Nenhum registro encontrado.");
  });

  it("renders data rows", () => {
    const data = [
      { id: "1", name: "Alice", email: "alice@test.com" },
      { id: "2", name: "Bob", email: "bob@test.com" },
    ];
    const wrapper = mount(DataTable, {
      props: { columns, data },
    });
    expect(wrapper.text()).toContain("Alice");
    expect(wrapper.text()).toContain("alice@test.com");
    expect(wrapper.text()).toContain("Bob");
    expect(wrapper.text()).toContain("bob@test.com");
  });

  it("emits row-click when row is clicked", async () => {
    const data = [{ id: "1", name: "Alice", email: "alice@test.com" }];
    const wrapper = mount(DataTable, {
      props: { columns, data },
    });
    await wrapper.find(".data-row").trigger("click");
    expect(wrapper.emitted("row-click")).toHaveLength(1);
    expect(wrapper.emitted("row-click")![0]).toEqual([data[0]]);
  });

  it("uses formatter when provided", () => {
    const cols = [
      { key: "status", label: "Status", formatter: (v: unknown) => (v === "A" ? "Ativo" : String(v)) },
    ];
    const data = [{ id: "1", status: "A" }];
    const wrapper = mount(DataTable, {
      props: { columns: cols, data },
    });
    expect(wrapper.text()).toContain("Ativo");
  });

  it("shows — for null/undefined values without formatter", () => {
    const cols = [{ key: "opt", label: "Opcional" }];
    const data = [{ id: "1", opt: null }];
    const wrapper = mount(DataTable, {
      props: { columns: cols, data },
    });
    expect(wrapper.text()).toContain("—");
  });
});
