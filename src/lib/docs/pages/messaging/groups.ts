import type { DocPage } from "../../types";

export const GROUPS: DocPage = {
  slug: "groups",
  title: "Groups",
  description:
    "End-to-end encrypted groups with several admins, per-member permissions, member tags, shared pins and a group privacy switch.",
  keywords: ["encrypted group chat", "group admins", "group permissions", "member tag", "group pins", "group privacy"],
  updated: "2026-10-19",
  sections: [
    {
      id: "create",
      heading: "Create a group",
      blocks: [
        { type: "p", text: "Pick people you are connected with, name the group and, if you like, add a photo, banner and description. You become its admin. Groups are end-to-end encrypted like DMs, and a group belongs to its members, not to a workspace." },
        {
          type: "list",
          items: [
            "Only people who accepted a connection with you can be added. Someone in privacy mode cannot be added at all.",
            "Someone added sees messages from the moment they joined, not the history before it.",
            "When someone joins or leaves, the group's key changes, so a person who left cannot read what comes after.",
          ],
        },
      ],
    },
    {
      id: "roles",
      heading: "Admins and members",
      blocks: [
        {
          type: "list",
          items: [
            "A group can have several admins. Admins configure permissions, change roles, remove members and delete the group.",
            "Being the creator gives no extra power: a creator who is made a member is an ordinary member.",
            "An admin has to be made a member before they can be removed.",
            "When the last admin leaves, the longest-standing member becomes admin.",
          ],
        },
      ],
    },
    {
      id: "permissions",
      heading: "Member permissions",
      blocks: [
        { type: "p", text: "Admins set what members may do, for the whole group (Group → Permissions) and, as exceptions, for one person (that member → Permissions). Admins can always do everything." },
        {
          type: "table",
          head: ["Permission", "Covers"],
          rows: [
            ["Send messages", "Text, reactions, threads, typing. Off means read-only, and turns every media permission off too."],
            ["Photos, Videos, Files, Music and voice", "Each kind of attachment on its own."],
            ["Add members", "Inviting people."],
            ["Pin messages", "Pinning for everyone."],
            ["Change group info", "Name, photo, banner, description."],
            ["Start calls", "Starting a group call. Joining a running call is always allowed."],
            ["Forward", "Forwarding messages out of the group."],
            ["Edit own tag", "Setting your own member tag."],
          ],
        },
        { type: "callout", text: "Permissions are set in the Android app. The web follows them and shows the result." },
      ],
    },
    {
      id: "tags-pins",
      heading: "Member tags and group pins",
      blocks: [
        {
          type: "list",
          items: [
            "A tag is a short label beside a member's name (up to 16 characters), such as “Design” or “Host”. Admins set anyone's; members set their own if allowed. The web shows tags too.",
            "Pinned messages are shared with the whole group (up to 50) and listed on the chat's Pins page, next to your own personal pins.",
          ],
        },
      ],
    },
    {
      id: "group-privacy",
      heading: "Group privacy",
      blocks: [
        { type: "p", text: "An admin switch that changes the group for everyone in it:" },
        {
          type: "list",
          items: [
            "Nobody can forward messages or save photos and files, admins included.",
            "Members other than admins see only the admins and themselves in the member list.",
            "On Android, screenshots are blocked on the chat, its details and its media.",
          ],
        },
        { type: "callout", tone: "warn", text: "Copying text still works, and nothing stops a second camera or a modified app. Screenshot blocking is Android only." },
      ],
    },
  ],
};
