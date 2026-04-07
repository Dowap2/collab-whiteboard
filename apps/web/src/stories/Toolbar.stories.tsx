import type { Meta, StoryObj } from "@storybook/react";
import { Toolbar } from "@/components/canvas/Toolbar";

const meta: Meta<typeof Toolbar> = {
  title: "Canvas/Toolbar",
  component: Toolbar,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const Default: Story = {};
