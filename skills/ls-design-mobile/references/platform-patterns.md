# Mobile platform patterns

## Responsive web

Support browser navigation, text zoom, reflow, link semantics, autofill, virtual keyboards, dynamic viewport units, and installed-app display modes where applicable. Test sticky elements against browser chrome and safe-area insets.

## Native and cross-platform

Use the established platform's screen transitions, bars, sheets, menus, selection controls, destructive confirmations, and permission timing. A shared design system may map tokens across platforms without forcing identical controls.

## Compact hierarchy

One screen may contain several actions, but only one should dominate a given decision moment. Use disclosure, grouping, and meaningful defaults instead of shrinking everything. Preserve context when moving detail into another screen or sheet.

## Validation states

Check large text, long localization, screen reader order, switch or keyboard access where applicable, reduced motion, high contrast, dark appearance, offline behavior, interrupted tasks, slow networks, virtual keyboard overlap, and safe-area collisions.
