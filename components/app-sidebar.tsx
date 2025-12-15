"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  IconCamera,
  IconFileAi,
  IconFileDescription,
} from "@tabler/icons-react"

// Custom Home icon component
const IconHome = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-home"
    ref={ref}
    {...props}
  >
    <path d="M19 21H5C4.44772 21 4 20.5523 4 20V11L1 11L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11L20 11V20C20 20.5523 19.5523 21 19 21ZM6 19H18V9.15745L12 3.7029L6 9.15745V19ZM8 15H16V17H8V15Z"></path>
  </svg>
))
IconHome.displayName = "IconHome"

// Custom Savings icon component
const IconSavings = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-savings"
    ref={ref}
    {...props}
  >
    <path fill="none" d="M0 0h24v24H0z"></path>
    <path d="M10.0049 19.9998H6.00488V21.9998H4.00488V19.9998H3.00488C2.4526 19.9998 2.00488 19.552 2.00488 18.9998V3.99977C2.00488 3.44748 2.4526 2.99977 3.00488 2.99977H10.0049V1.59C10.0049 1.31385 10.2287 1.09 10.5049 1.09C10.5324 1.09 10.5599 1.09227 10.5871 1.0968L21.1693 2.8605C21.6515 2.94086 22.0049 3.35805 22.0049 3.84689V5.99977H23.0049V7.99977H22.0049V14.9998H23.0049V16.9998H22.0049V19.1526C22.0049 19.6415 21.6515 20.0587 21.1693 20.139L20.0049 20.3331V21.9998H18.0049V20.6664L10.5871 21.9027C10.3147 21.9481 10.0571 21.7641 10.0117 21.4917C10.0072 21.4646 10.0049 21.4371 10.0049 21.4095V19.9998ZM12.0049 19.6388L20.0049 18.3055V4.69402L12.0049 3.36069V19.6388ZM16.5049 13.9998C15.6765 13.9998 15.0049 12.8805 15.0049 11.4998C15.0049 10.1191 15.6765 8.99977 16.5049 8.99977C17.3333 8.99977 18.0049 10.1191 18.0049 11.4998C18.0049 12.8805 17.3333 13.9998 16.5049 13.9998Z"></path>
  </svg>
))
IconSavings.displayName = "IconSavings"

// Custom Analytics icon component
const IconAnalytics = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-analytics"
    ref={ref}
    {...props}
  >
    <path d="M344 170.6C362.9 161.6 376 142.3 376 120C376 89.1 350.9 64 320 64C289.1 64 264 89.1 264 120C264 142.3 277.1 161.6 296 170.6L296 269.4C293.2 270.7 290.5 272.3 288 274.1L207.9 228.3C209.5 207.5 199.3 186.7 180 175.5C153.2 160 119 169.2 103.5 196C88 222.8 97.2 257 124 272.5C125.3 273.3 126.6 274 128 274.6L128 365.4C126.7 366 125.3 366.7 124 367.5C97.2 383 88 417.2 103.5 444C119 470.8 153.2 480 180 464.5C199.3 453.4 209.4 432.5 207.8 411.7L258.3 382.8C246.8 371.6 238.4 357.2 234.5 341.1L184 370.1C181.4 368.3 178.8 366.8 176 365.4L176 274.6C178.8 273.3 181.5 271.7 184 269.9L264.1 315.7C264 317.1 263.9 318.5 263.9 320C263.9 342.3 277 361.6 295.9 370.6L295.9 469.4C277 478.4 263.9 497.7 263.9 520C263.9 550.9 289 576 319.9 576C350.8 576 375.9 550.9 375.9 520C375.9 497.7 362.8 478.4 343.9 469.4L343.9 370.6C346.7 369.3 349.4 367.7 351.9 365.9L432 411.7C430.4 432.5 440.6 453.3 459.8 464.5C486.6 480 520.8 470.8 536.3 444C551.8 417.2 542.6 383 515.8 367.5C514.5 366.7 513.1 366 511.8 365.4L511.8 274.6C513.2 274 514.5 273.3 515.8 272.5C542.6 257 551.8 222.8 536.3 196C520.8 169.2 486.8 160 460 175.5C440.7 186.6 430.6 207.5 432.2 228.3L381.6 257.2C393.1 268.4 401.5 282.8 405.4 298.9L456 269.9C458.6 271.7 461.2 273.2 464 274.6L464 365.4C461.2 366.7 458.5 368.3 456 370L375.9 324.2C376 322.8 376.1 321.4 376.1 319.9C376.1 297.6 363 278.3 344.1 269.3L344.1 170.5z"></path>
  </svg>
))
IconAnalytics.displayName = "IconAnalytics"

// Custom Trends icon component
const IconTrends = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-trends"
    ref={ref}
    {...props}
  >
    <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z"></path>
  </svg>
))
IconTrends.displayName = "IconTrends"

// Custom Chat icon component (using star image)
const IconChat = React.forwardRef<
  HTMLImageElement,
  React.ComponentProps<"img">
>((props, ref) => {
  return (
    <img
      src="/starB.png"
      alt="Chat"
      width={20}
      height={20}
      className="icon-chat w-5 h-5 ml-[1px]"
      style={{ width: '20px', height: '20px', marginLeft: '1px' }}
      ref={ref}
      {...props}
    />
  )
})
IconChat.displayName = "IconChat"

// Custom Fridge icon component
const IconFridge = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-fridge"
    ref={ref}
    {...props}
  >
    <path d="M352.2 64C352.2 46.3 337.9 32 320.2 32C302.5 32 288.2 46.3 288.2 64L288.2 126.1L273.2 111.1C263.8 101.7 248.6 101.7 239.3 111.1C230 120.5 229.9 135.7 239.3 145L288.3 194L288.3 264.6L227.1 229.3L209.2 162.4C205.8 149.6 192.6 142 179.8 145.4C167 148.8 159.3 162 162.7 174.8L168.2 195.3L114.5 164.3C99.2 155.5 79.6 160.7 70.8 176C62 191.3 67.2 210.9 82.5 219.7L136.2 250.7L115.7 256.2C102.9 259.6 95.3 272.8 98.7 285.6C102.1 298.4 115.3 306 128.1 302.6L195 284.7L256.2 320L195 355.3L128.1 337.4C115.3 334 102.1 341.6 98.7 354.4C95.3 367.2 102.9 380.4 115.7 383.8L136.2 389.3L82.5 420.3C67.2 429.1 62 448.7 70.8 464C79.6 479.3 99.2 484.6 114.5 475.7L168.2 444.7L162.7 465.2C159.3 478 166.9 491.2 179.7 494.6C192.5 498 205.7 490.4 209.1 477.6L227 410.7L288.2 375.4L288.2 446L239.2 495C229.8 504.4 229.8 519.6 239.2 528.9C248.6 538.2 263.8 538.3 273.1 528.9L288.1 513.9L288.1 576C288.1 593.7 302.4 608 320.1 608C337.8 608 352.1 593.7 352.1 576L352.1 513.9L367.1 528.9C376.5 538.3 391.7 538.3 401 528.9C410.3 519.5 410.4 504.3 401 495L352 446L352 375.4L413.2 410.7L431.1 477.6C434.5 490.4 447.7 498 460.5 494.6C473.3 491.2 480.9 478 477.5 465.2L472 444.7L525.7 475.7C541 484.5 560.6 479.3 569.4 464C578.2 448.7 573 429.1 557.7 420.3L504 389.3L524.5 383.8C537.3 380.4 544.9 367.2 541.5 354.4C538.1 341.6 524.9 334 512.1 337.4L445.2 355.3L384 320L445.2 284.7L512.1 302.6C524.9 306 538.1 298.4 541.5 285.6C544.9 272.8 537.3 259.6 524.5 256.2L504 250.7L557.7 219.7C573 210.9 578.3 191.3 569.4 176C560.5 160.7 541 155.5 525.7 164.3L472 195.3L477.5 174.8C480.9 162 473.3 148.8 460.5 145.4C447.7 142 434.5 149.6 431.1 162.4L413.2 229.3L352 264.6L352 194L401 145C410.4 135.6 410.4 120.4 401 111.1C391.6 101.8 376.4 101.7 367.1 111.1L352.1 126.1L352.1 64z"></path>
  </svg>
))
IconFridge.displayName = "IconFridge"

// Custom Data Library icon component
const IconDataLibrary = React.forwardRef<
  SVGSVGElement,
  React.ComponentProps<"svg">
>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    width="16"
    height="16"
    fill="currentColor"
    className="icon-data-library"
    ref={ref}
    {...props}
  >
    <path d="M544 269.8C529.2 279.6 512.2 287.5 494.5 293.8C447.5 310.6 385.8 320 320 320C254.2 320 192.4 310.5 145.5 293.8C127.9 287.5 110.8 279.6 96 269.8L96 352C96 396.2 196.3 432 320 432C443.7 432 544 396.2 544 352L544 269.8zM544 192L544 144C544 99.8 443.7 64 320 64C196.3 64 96 99.8 96 144L96 192C96 236.2 196.3 272 320 272C443.7 272 544 236.2 544 192zM494.5 453.8C447.6 470.5 385.9 480 320 480C254.1 480 192.4 470.5 145.5 453.8C127.9 447.5 110.8 439.6 96 429.8L96 496C96 540.2 196.3 576 320 576C443.7 576 544 540.2 544 496L544 429.8C529.2 439.6 512.2 447.5 494.5 453.8z"></path>
  </svg>
))
IconDataLibrary.displayName = "IconDataLibrary"

import { useTheme } from "next-themes"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Home",
      url: "/home",
      icon: IconHome,
    },
    {
      title: "Savings",
      url: "/savings",
      icon: IconSavings,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconAnalytics,
    },
    {
      title: "Trends",
      url: "/trends",
      icon: IconTrends,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconChat,
    },
    {
      title: "Fridge",
      url: "/fridge",
      icon: IconFridge,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDataLibrary,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onQuickCreate?: () => void
}

export function AppSidebar({ onQuickCreate, ...props }: AppSidebarProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          "--sidebar-width": "calc(16rem - 5px)",
          "--sidebar-width-icon": "calc(4.5rem - 5px)",
        } as React.CSSProperties
      }
      {...props}
    >
      <SidebarHeader className="flex items-center justify-center pr-[15px]">
        <SidebarMenu className="flex w-full items-center justify-center">
          <SidebarMenuItem className="w-auto h-auto">
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-4 !h-auto group-data-[collapsible=icon]:!p-3 group-data-[collapsible=icon]:!h-[4rem] group-data-[collapsible=icon]:!w-[4rem] group-data-[collapsible=icon]:!justify-center"
              aria-label="Home"
            >
              <Link href="/">
                <>
                  {mounted ? (
                    <Image
                      src={theme === "dark" ? "/Trakzi/TrakzilogoB.png" : "/Trakzi/Trakzilogo.png"}
                      alt="Trakzi"
                      width={180}
                      height={60}
                      className="hidden h-16 w-auto object-contain group-data-[state=expanded]:block"
                    />
                  ) : (
                    <div className="hidden h-16 w-[180px] group-data-[state=expanded]:block" />
                  )}
                  {mounted ? (
                    <Image
                      src="/Trakzi/Trakziicon.png"
                      alt="Trakzi icon"
                      width={64}
                      height={64}
                      className="hidden h-12 w-auto object-contain group-data-[state=collapsed]:block"
                    />
                  ) : (
                    <div className="hidden h-12 w-[64px] group-data-[state=collapsed]:block" />
                  )}
                </>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onQuickCreate={onQuickCreate} />
        <NavDocuments items={data.documents} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
