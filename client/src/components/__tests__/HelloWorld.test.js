import { mount } from '@vue/test-utils';
import HelloWorld from '../HelloWorld.vue';

test('renders message and increments count', async () => {
  const wrapper = mount(HelloWorld, { props: { msg: 'Hi Vitest' } });
  expect(wrapper.text()).toContain('Hi Vitest');
  const btn = wrapper.get('button');
  await btn.trigger('click');
  expect(wrapper.text()).toContain('Count: 1');
});
