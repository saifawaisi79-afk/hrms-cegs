'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Comprehensive dataset of modern emojis with keywords for search
const MODERN_EMOJIS_DATA = [
  // QUICK / POPULAR REACTIONS
  {
    category: 'Popular',
    icon: '⚡',
    label: 'Quick Reactions',
    items: [
      { e: '❤️', n: 'Red Heart', k: 'heart love like red' },
      { e: '👍', n: 'Thumbs Up', k: 'thumbs up like approve good yes' },
      { e: '😂', n: 'Face with Tears of Joy', k: 'laugh cry lol funny haha' },
      { e: '🔥', n: 'Fire', k: 'fire hot lit burn trending' },
      { e: '🎉', n: 'Party Popper', k: 'party celebrate popper congratulations yay' },
      { e: '😍', n: 'Smiling Face with Heart-Eyes', k: 'love heart eyes crush' },
      { e: '🙏', n: 'Folded Hands', k: 'pray please thank you namaste' },
      { e: '🚀', n: 'Rocket', k: 'rocket launch fast moon boost' },
      { e: '💯', n: 'Hundred Points', k: '100 perfect score keep it real' },
      { e: '✨', n: 'Sparkles', k: 'sparkles shine magic clean new' },
      { e: '👏', n: 'Clapping Hands', k: 'clap applause bravo kudos' },
      { e: '🙌', n: 'Raising Hands', k: 'praise celebrate hooray' },
      { e: '🫶', n: 'Heart Hands', k: 'heart hands love care' },
      { e: '🫡', n: 'Saluting Face', k: 'salute respect yes sir copy' },
    ],
  },
  // SMILEYS & EMOTIONS
  {
    category: 'Smileys',
    icon: '😃',
    label: 'Smileys & Emotion',
    items: [
      { e: '😀', n: 'Grinning Face', k: 'smile happy joy grin' },
      { e: '😃', n: 'Grinning Face with Big Eyes', k: 'smile happy joy haha' },
      { e: '😄', n: 'Grinning Face with Smiling Eyes', k: 'happy joy smile' },
      { e: '😁', n: 'Beaming Face with Smiling Eyes', k: 'teeth smile happy grin' },
      { e: '😆', n: 'Grinning Squinting Face', k: 'laugh haha funny' },
      { e: '😅', n: 'Grinning Face with Sweat', k: 'relief sweat phew nervous' },
      { e: '🤣', n: 'Rolling on the Floor Laughing', k: 'rofl lol lmao laugh funny' },
      { e: '😂', n: 'Face with Tears of Joy', k: 'laugh cry lol haha funny' },
      { e: '🙂', n: 'Slightly Smiling Face', k: 'smile ok fine calm' },
      { e: '🙃', n: 'Upside-Down Face', k: 'silly sarcastic ironic' },
      { e: '🫠', n: 'Melting Face', k: 'melt hot embarrassed awkward' },
      { e: '😉', n: 'Winking Face', k: 'wink joke secret flirty' },
      { e: '😊', n: 'Smiling Face with Smiling Eyes', k: 'blush smile warm happy' },
      { e: '😇', n: 'Smiling Face with Halo', k: 'angel halo innocent good' },
      { e: '🥰', n: 'Smiling Face with Hearts', k: 'love in love romantic sweet' },
      { e: '😍', n: 'Heart Eyes', k: 'love heart eyes crush wow' },
      { e: '🤩', n: 'Star-Struck', k: 'star wow amazed impressed' },
      { e: '😘', n: 'Face Blowing a Kiss', k: 'kiss love heart mwah' },
      { e: '😗', n: 'Kissing Face', k: 'kiss whistle' },
      { e: '😋', n: 'Face Savoring Food', k: 'delicious yum food tongue' },
      { e: '😛', n: 'Face with Tongue', k: 'silly tongue joke' },
      { e: '😜', n: 'Winking Face with Tongue', k: 'crazy silly tongue wink' },
      { e: '🤪', n: 'Zany Face', k: 'crazy wild party silly' },
      { e: '😝', n: 'Squinting Face with Tongue', k: 'tongue funny silly' },
      { e: '🤑', n: 'Money-Mouth Face', k: 'money cash rich dollar profit' },
      { e: '🤗', n: 'Smiling Face with Open Hands', k: 'hug embrace warm welcome' },
      { e: '🫣', n: 'Face with Peeking Eye', k: 'peek hide shy nervous scare' },
      { e: '🤫', n: 'Shushing Face', k: 'shh quiet secret silence' },
      { e: '🤔', n: 'Thinking Face', k: 'think ponder consider wonder' },
      { e: '🫡', n: 'Saluting Face', k: 'salute respect yes sir' },
      { e: '🤐', n: 'Zipper-Mouth Face', k: 'secret shut silent zip' },
      { e: '🤨', n: 'Face with Raised Eyebrow', k: 'doubt suspicious really skeptical' },
      { e: '😐', n: 'Neutral Face', k: 'neutral poker face whatever' },
      { e: '😑', n: 'Expressionless Face', k: 'blank deadpan sigh' },
      { e: '😶', n: 'Face Without Mouth', k: 'speechless quiet mute' },
      { e: '😏', n: 'Smirking Face', k: 'smirk flirt sly suggestive' },
      { e: '😒', n: 'Unamused Face', k: 'bored unamused annoyed side eye' },
      { e: '🙄', n: 'Face with Rolling Eyes', k: 'eye roll whatever annoyed' },
      { e: '😬', n: 'Grimacing Face', k: 'grimace awkward oops yikes' },
      { e: '🤥', n: 'Lying Face', k: 'pinocchio liar lie nose' },
      { e: '😌', n: 'Relieved Face', k: 'relief phew calm peaceful' },
      { e: '😔', n: 'Pensive Face', k: 'sad regret pensive down' },
      { e: '😪', n: 'Sleepy Face', k: 'tired sleepy snot' },
      { e: '🤤', n: 'Drooling Face', k: 'drool hungry crave delicious' },
      { e: '😴', n: 'Sleeping Face', k: 'sleep zzz bedtime night' },
      { e: '😷', n: 'Face with Medical Mask', k: 'sick mask covid health' },
      { e: '🤒', n: 'Face with Thermometer', k: 'sick fever ill' },
      { e: '🤕', n: 'Face with Head-Bandage', k: 'hurt injury pain bandage' },
      { e: '🤢', n: 'Nauseated Face', k: 'sick green gross vomit' },
      { e: '🤮', n: 'Face Vomiting', k: 'vomit barf puke gross' },
      { e: '🤧', n: 'Sneezing Face', k: 'sneeze cold tissue sick' },
      { e: '🥵', n: 'Hot Face', k: 'hot heat summer sweat' },
      { e: '🥶', n: 'Cold Face', k: 'cold ice freeze winter shivering' },
      { e: '🥴', n: 'Woozy Face', k: 'woozy drunk dizzy tired' },
      { e: '😵', n: 'Face with Crossed-Out Eyes', k: 'dizzy knocked out dead' },
      { e: '🤯', n: 'Exploding Head', k: 'mind blown shock boom wow' },
      { e: '🤠', n: 'Cowboy Hat Face', k: 'cowboy yeehaw country' },
      { e: '🥳', n: 'Partying Face', k: 'party celebrate birthday horn' },
      { e: '😎', n: 'Smiling Face with Sunglasses', k: 'cool sunglasses chill boss' },
      { e: '🤓', n: 'Nerd Face', k: 'nerd glasses smart tech geek' },
      { e: '🧐', n: 'Face with Monocle', k: 'monocle inspect examine classy' },
      { e: '😕', n: 'Confused Face', k: 'confused puzzled huh' },
      { e: '😟', n: 'Worried Face', k: 'worried nervous anxious' },
      { e: '🥺', n: 'Pleading Face', k: 'please puppy eyes beg puppy' },
      { e: '🥹', n: 'Face Holding Back Tears', k: 'tears touched emotional proud grateful' },
      { e: '😭', n: 'Loudly Crying Face', k: 'cry sobbing sad tears bawl' },
      { e: '😱', n: 'Face Screaming in Fear', k: 'scream shock scared horror' },
      { e: '😖', n: 'Confounded Face', k: 'frustrated annoyed stressed' },
      { e: '😣', n: 'Persevering Face', k: 'struggle hold on tight' },
      { e: '😞', n: 'Disappointed Face', k: 'disappointed sad bummed' },
      { e: '😤', n: 'Face with Steam From Nose', k: 'triumph huff angry proud win' },
      { e: '😡', n: 'Enraged Face', k: 'angry red rage mad' },
      { e: '😠', n: 'Angry Face', k: 'mad furious cross' },
      { e: '🤬', n: 'Face with Symbols on Mouth', k: 'curse swear cuss angry' },
      { e: '😈', n: 'Smiling Face with Horns', k: 'devil evil mischief bad' },
      { e: '👿', n: 'Angry Face with Horns', k: 'demon evil angry' },
      { e: '💀', n: 'Skull', k: 'dead dying funny skull skeleton' },
      { e: '☠️', n: 'Skull and Crossbones', k: 'danger poison dead' },
      { e: '💩', n: 'Pile of Poo', k: 'poop crap funny turd' },
      { e: '🤡', n: 'Clown Face', k: 'clown circus foolish silly' },
      { e: '👻', n: 'Ghost', k: 'spooky halloween spirit boo' },
    ],
  },
  // GESTURES & PEOPLE
  {
    category: 'Gestures',
    icon: '👋',
    label: 'Gestures & People',
    items: [
      { e: '👋', n: 'Waving Hand', k: 'wave hello goodbye hi bye' },
      { e: '🤚', n: 'Raised Back of Hand', k: 'hand raised stop' },
      { e: '🖐️', n: 'Hand with Fingers Splayed', k: 'five palm spread' },
      { e: '✋', n: 'Raised Hand', k: 'stop high five palm highfive' },
      { e: '🖖', n: 'Vulcan Salute', k: 'spock trek live long prosper' },
      { e: '👌', n: 'OK Hand', k: 'ok okay fine perfect perfect' },
      { e: '🤌', n: 'Pinched Fingers', k: 'italian gesture what do you want' },
      { e: '🤏', n: 'Pinching Hand', k: 'pinch small little tiny' },
      { e: '✌️', n: 'Victory Hand', k: 'peace two victory v sign' },
      { e: '🤞', n: 'Crossed Fingers', k: 'luck wish hope crossed' },
      { e: '🫰', n: 'Hand with Index and Thumb Crossed', k: 'kpop finger heart money snap' },
      { e: '🤟', n: 'Love-You Gesture', k: 'love ily rock sign' },
      { e: '🤘', n: 'Sign of the Horns', k: 'rock on metal concert' },
      { e: '🤙', n: 'Call Me Hand', k: 'call shaka hang loose phone' },
      { e: '👈', n: 'Backhand Index Pointing Left', k: 'point left direction' },
      { e: '👉', n: 'Backhand Index Pointing Right', k: 'point right direction' },
      { e: '👆', n: 'Backhand Index Pointing Up', k: 'point up direction' },
      { e: '👇', n: 'Backhand Index Pointing Down', k: 'point down direction' },
      { e: '☝️', n: 'Index Pointing Up', k: 'point up idea attention' },
      { e: '👍', n: 'Thumbs Up', k: 'thumbs up like yes approve good' },
      { e: '👎', n: 'Thumbs Down', k: 'thumbs down dislike bad no' },
      { e: '✊', n: 'Raised Fist', k: 'fist power solidarity punch' },
      { e: '👊', n: 'Oncoming Fist', k: 'fist bump punch bro' },
      { e: '🤛', n: 'Left-Facing Fist', k: 'fist bump left' },
      { e: '🤜', n: 'Right-Facing Fist', k: 'fist bump right' },
      { e: '👏', n: 'Clapping Hands', k: 'clap applause praise bravo' },
      { e: '🙌', n: 'Raising Hands', k: 'hands celebrate yay praise' },
      { e: '🫶', n: 'Heart Hands', k: 'heart hands love care affection' },
      { e: '👐', n: 'Open Hands', k: 'open hands hug welcome' },
      { e: '🤲', n: 'Palms Up Together', k: 'prayer cupped hands duaa' },
      { e: '🤝', n: 'Handshake', k: 'deal agreement partner shake hands' },
      { e: '🙏', n: 'Folded Hands', k: 'pray please thank you namaste thanks' },
      { e: '✍️', n: 'Writing Hand', k: 'write note pen signing' },
      { e: '💅', n: 'Nail Polish', k: 'slay nails manicure sassy' },
      { e: '🤳', n: 'Selfie', k: 'selfie camera photo phone' },
      { e: '💪', n: 'Flexed Biceps', k: 'strong muscle flex power gym' },
      { e: '🧠', n: 'Brain', k: 'brain smart intelligent mind thinking' },
      { e: '🫀', n: 'Anatomical Heart', k: 'heart organ health life' },
      { e: '👀', n: 'Eyes', k: 'eyes look see check watching' },
      { e: '👁️', n: 'Eye', k: 'eye look see observe' },
    ],
  },
  // WORK, TECH & GOALS
  {
    category: 'Work',
    icon: '💼',
    label: 'Work, Tech & Goals',
    items: [
      { e: '💼', n: 'Briefcase', k: 'work job office business briefcase' },
      { e: '💻', n: 'Laptop', k: 'laptop computer code tech screen' },
      { e: '🖥️', n: 'Desktop Computer', k: 'pc desktop workstation tech' },
      { e: '📱', n: 'Mobile Phone', k: 'iphone phone mobile call cell' },
      { e: '📊', n: 'Bar Chart', k: 'chart analytics graph data report metrics' },
      { e: '📈', n: 'Chart Increasing', k: 'growth trend up profit sales' },
      { e: '📉', n: 'Chart Decreasing', k: 'down trend loss decrease' },
      { e: '📁', n: 'File Folder', k: 'folder files storage organize' },
      { e: '📂', n: 'Open File Folder', k: 'folder directory documents' },
      { e: '📄', n: 'Page Facing Up', k: 'document file invoice resume paper' },
      { e: '📝', n: 'Memo', k: 'note write pencil memo tasks' },
      { e: '📋', n: 'Clipboard', k: 'clipboard checklist audit inspect' },
      { e: '📅', n: 'Calendar', k: 'date calendar schedule meeting day' },
      { e: '🗓️', n: 'Spiral Calendar', k: 'calendar schedule agenda date' },
      { e: '⏰', n: 'Alarm Clock', k: 'clock alarm time morning deadline' },
      { e: '⏱️', n: 'Stopwatch', k: 'timer stopwatch shift speed' },
      { e: '⏳', n: 'Hourglass Not Done', k: 'wait time pending loading delay' },
      { e: '🎯', n: 'Direct Hit', k: 'target goal kpi bullseye achieve' },
      { e: '💡', n: 'Light Bulb', k: 'idea insight smart bright solution' },
      { e: '⚡', n: 'High Voltage', k: 'electric flash power lightning energy fast' },
      { e: '🚀', n: 'Rocket', k: 'launch scale growth blast off' },
      { e: '🏆', n: 'Trophy', k: 'winner champion prize award trophy' },
      { e: '🥇', n: '1st Place Medal', k: 'first gold winner number one' },
      { e: '🥈', n: '2nd Place Medal', k: 'second silver medal' },
      { e: '🥉', n: '3rd Place Medal', k: 'third bronze medal' },
      { e: '🎖️', n: 'Military Medal', k: 'honor badge award' },
      { e: '🏅', n: 'Sports Medal', k: 'achievement medal success' },
      { e: '📌', n: 'Pushpin', k: 'pin important note notice' },
      { e: '📍', n: 'Round Pushpin', k: 'location map pin place' },
      { e: '📎', n: 'Paperclip', k: 'attach file paperclip document' },
      { e: '🔗', n: 'Link', k: 'url link connect hyper' },
      { e: '🔑', n: 'Key', k: 'access password secret credential key' },
      { e: '🔒', n: 'Locked', k: 'secure lock private safe encrypted' },
      { e: '🔓', n: 'Unlocked', k: 'open access unlock' },
      { e: '🔔', n: 'Bell', k: 'alert notify notification ring' },
      { e: '📢', n: 'Loudspeaker', k: 'announcement broadcast shout public' },
      { e: '💰', n: 'Money Bag', k: 'salary money finance payroll cash payment' },
      { e: '💵', n: 'Dollar Banknote', k: 'cash money payment bill' },
      { e: '💳', n: 'Credit Card', k: 'card expense invoice billing' },
      { e: '🏢', n: 'Office Building', k: 'office company corporate building headquarters' },
      { e: '✅', n: 'Check Mark Button', k: 'done approved check success pass verified' },
      { e: '❌', n: 'Cross Mark', k: 'no reject cancel decline error' },
      { e: '⚠️', n: 'Warning', k: 'caution warning danger notice alert' },
    ],
  },
  // HEARTS & SYMBOLS
  {
    category: 'Hearts',
    icon: '💖',
    label: 'Hearts & Symbols',
    items: [
      { e: '❤️', n: 'Red Heart', k: 'heart love red passion' },
      { e: '🧡', n: 'Orange Heart', k: 'heart orange care' },
      { e: '💛', n: 'Yellow Heart', k: 'heart yellow friendship' },
      { e: '💚', n: 'Green Heart', k: 'heart green nature env' },
      { e: '💙', n: 'Blue Heart', k: 'heart blue peace loyal' },
      { e: '💜', n: 'Purple Heart', k: 'heart purple royalty' },
      { e: '🖤', n: 'Black Heart', k: 'heart black sorrow dark' },
      { e: '🤍', n: 'White Heart', k: 'heart white pure peace' },
      { e: '🤎', n: 'Brown Heart', k: 'heart brown earth' },
      { e: '💔', n: 'Broken Heart', k: 'heartbreak sad pain hurt' },
      { e: '❣️', n: 'Heart Exclamation', k: 'heart exclamation love' },
      { e: '💕', n: 'Two Hearts', k: 'love two hearts sweet' },
      { e: '💞', n: 'Revolving Hearts', k: 'revolving hearts love' },
      { e: '💓', n: 'Beating Heart', k: 'heartbeat pulse love alive' },
      { e: '💗', n: 'Growing Heart', k: 'growing heart love' },
      { e: '💖', n: 'Sparkling Heart', k: 'sparkle heart shiny love' },
      { e: '💘', n: 'Heart with Arrow', k: 'cupid arrow love struck' },
      { e: '💝', n: 'Heart with Ribbon', k: 'gift present ribbon love' },
      { e: '✨', n: 'Sparkles', k: 'sparkle star magic clean brilliant' },
      { e: '⭐', n: 'Star', k: 'star favorite rating review' },
      { e: '🌟', n: 'Glowing Star', k: 'glowing star shine bright' },
      { e: '💥', n: 'Collision', k: 'boom blast explosion impact' },
      { e: '💫', n: 'Dizzy', k: 'shooting star sparkle magic' },
      { e: '🎉', n: 'Party Popper', k: 'celebration yay congrats' },
      { e: '🎊', n: 'Confetti Ball', k: 'confetti party event' },
      { e: '🎈', n: 'Balloon', k: 'balloon party birthday' },
      { e: '🎁', n: 'Wrapped Gift', k: 'present gift surprise birthday' },
      { e: '☕', n: 'Hot Beverage', k: 'coffee tea break hot cafe' },
      { e: '🌈', n: 'Rainbow', k: 'rainbow pride colorful hope' },
      { e: '☀️', n: 'Sun', k: 'sun sunny day bright morning' },
      { e: '🌙', n: 'Crescent Moon', k: 'moon night evening sleep' },
      { e: '🔥', n: 'Fire', k: 'fire hot flame trend' },
      { e: '💯', n: 'Hundred Points', k: '100 perfect score accurate' },
      { e: '✔️', n: 'Check Mark', k: 'check tick yes done' },
      { e: '🔘', n: 'Radio Button', k: 'button circle target' },
      { e: '🟢', n: 'Green Circle', k: 'online green active live' },
      { e: '🔴', n: 'Red Circle', k: 'offline red urgent recording' },
      { e: '🟡', n: 'Yellow Circle', k: 'away yellow pending warning' },
    ],
  },
];

/**
 * Modern, rich WhatsApp/Telegram-style Emoji Picker with search,
 * categories, quick-reactions, hover preview, and recent emojis.
 */
export function ModernWhatsAppEmojiPicker({ onSelectEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState(null);
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const stored = localStorage.getItem('cegs_recent_emojis');
      return stored ? JSON.parse(stored) : ['❤️', '👍', '😂', '🔥', '🎉', '😍', '🙏', '🚀'];
    } catch {
      return ['❤️', '👍', '😂', '🔥', '🎉', '😍', '🙏', '🚀'];
    }
  });

  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handlePickEmoji = (item) => {
    const char = item.e || item;
    onSelectEmoji(char);

    // Save into recents
    try {
      setRecentEmojis((prev) => {
        const next = [char, ...prev.filter((c) => c !== char)].slice(0, 16);
        localStorage.setItem('cegs_recent_emojis', JSON.stringify(next));
        return next;
      });
    } catch {}
  };

  // Filter emojis based on search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched = [];
    const seen = new Set();

    MODERN_EMOJIS_DATA.forEach((cat) => {
      cat.items.forEach((item) => {
        if (!seen.has(item.e)) {
          if (
            item.n.toLowerCase().includes(q) ||
            item.k.toLowerCase().includes(q) ||
            item.e.includes(q)
          ) {
            seen.add(item.e);
            matched.push(item);
          }
        }
      });
    });

    return matched;
  }, [searchQuery]);

  const activeCategoryData = MODERN_EMOJIS_DATA[activeCategory] || MODERN_EMOJIS_DATA[0];

  return (
    <div
      style={{
        width: 360,
        height: 410,
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22), 0 4px 14px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'waPickerPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* SEARCH BAR */}
      <div
        style={{
          padding: '10px 12px 8px',
          background: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F1F5F9',
            borderRadius: 12,
            padding: '6px 12px',
          }}
        >
          <span style={{ fontSize: 13, color: '#94A3B8' }}>🔍</span>
          <input
            ref={searchInputRef}
            placeholder="Search emoji (e.g. fire, love, laugh, ok)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12.5,
              fontWeight: 500,
              color: '#1E293B',
              padding: 0,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: 12,
                padding: '2px 4px',
                borderRadius: '50%',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* QUICK REACTION BAR (WHEN NOT SEARCHING) */}
      {!searchQuery && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '4px 10px',
            background: '#F8FAFC',
            borderBottom: '1px solid #F1F5F9',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', marginRight: 4, textTransform: 'uppercase' }}>
            Fast
          </span>
          {recentEmojis.slice(0, 9).map((char, i) => (
            <button
              key={`${char}-${i}`}
              type="button"
              onClick={() => handlePickEmoji(char)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.12s, background 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.3)';
                e.currentTarget.style.background = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Quick reaction"
            >
              {char}
            </button>
          ))}
        </div>
      )}

      {/* CATEGORY ICON TABS (WHEN NOT SEARCHING) */}
      {!searchQuery && (
        <div
          style={{
            display: 'flex',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '4px 8px',
            justifyContent: 'space-between',
          }}
        >
          {MODERN_EMOJIS_DATA.map((cat, idx) => {
            const isSelected = activeCategory === idx;
            return (
              <button
                key={cat.category}
                type="button"
                onClick={() => setActiveCategory(idx)}
                style={{
                  background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 18,
                  width: 38,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                title={cat.label}
              >
                <span>{cat.icon}</span>
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 14,
                      height: 2.5,
                      borderRadius: 99,
                      background: '#10B981',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* EMOJI GRID AREA */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          scrollbarWidth: 'thin',
        }}
      >
        {searchQuery ? (
          /* SEARCH RESULTS VIEW */
          searchResults && searchResults.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' }}>
                Search Results ({searchResults.length})
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 4,
                }}
              >
                {searchResults.map((item) => (
                  <button
                    key={item.e}
                    type="button"
                    onClick={() => handlePickEmoji(item)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 24,
                      height: 38,
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.1s, background 0.1s',
                      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                    }}
                    onFocus={() => setHoveredEmoji(item)}
                  >
                    {item.e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94A3B8', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
              No emojis found for "{searchQuery}"
            </div>
          )
        ) : (
          /* CATEGORY VIEW */
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' }}>
              {activeCategoryData.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 4,
              }}
            >
              {activeCategoryData.items.map((item) => (
                <button
                  key={item.e}
                  type="button"
                  onClick={() => handlePickEmoji(item)}
                  onMouseEnter={() => setHoveredEmoji(item)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 24,
                    height: 38,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s, background 0.1s',
                    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                  }}
                  onFocus={() => setHoveredEmoji(item)}
                >
                  {item.e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER PREVIEW BAR (LIKE APPLE / DISCORD) */}
      <div
        style={{
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          padding: '6px 14px',
          height: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {hoveredEmoji ? (
          <>
            <span style={{ fontSize: 24 }}>{hoveredEmoji.e}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hoveredEmoji.n}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
            Hover over an emoji to inspect · Click to insert
          </span>
        )}
      </div>
    </div>
  );
}

export default ModernWhatsAppEmojiPicker;
