import { IconButton, PrimaryButton, Stack, TextField, useTheme, Checkbox, Icon, Spinner } from '@fluentui/react';
import React, { useEffect, useRef, useState } from 'react';
import {
    callingWidgetSetupContainerStyles,
    checkboxStyles,
    startCallButtonStyles,
    callingWidgetContainerStyles,
    callIconStyles,
    logoContainerStyles,
    collapseButtonStyles
} from '../styles/CallingWidgetComponent.styles';

import { AzureCommunicationTokenCredential, CommunicationUserIdentifier, MicrosoftTeamsAppIdentifier } from '@azure/communication-common';
import {
    CallAdapter,
    CallAdapterState,
    CallComposite,
    CommonCallAdapterOptions,
    StartCallIdentifier,
    createAzureCommunicationCallAdapter
} from '@azure/communication-react';
// lets add to our react imports as well
import { useCallback, useMemo } from 'react';

import { callingWidgetInCallContainerStyles } from '../styles/CallingWidgetComponent.styles';

/**
 * Properties needed for our widget to start a call.
 */
export type WidgetAdapterArgs = {
    token: string;
    userId: CommunicationUserIdentifier;
    teamsAppIdentifier: MicrosoftTeamsAppIdentifier;
};

export interface CallingWidgetComponentProps {
    /**
     *  arguments for creating an AzureCommunicationCallAdapter for your Calling experience
     */
    widgetAdapterArgs: WidgetAdapterArgs;
    /**
     * Custom render function for displaying logo.
     * @returns
     */
    onRenderLogo?: () => JSX.Element;
}

/**
 * Widget for Calling Widget
 * @param props
 */
export const CallingWidgetComponent = (
    props: CallingWidgetComponentProps
): JSX.Element => {
    const { onRenderLogo, widgetAdapterArgs } = props;

    const [widgetState, setWidgetState] = useState<'new' | 'setup' | 'inCall'>('new');
    const [displayName, setDisplayName] = useState<string>();
    const [consentToData, setConsentToData] = useState<boolean>(false);
    const [useLocalVideo, setUseLocalVideo] = useState<boolean>(false);
    const [adapter, setAdapter] = useState<CallAdapter>();

    const callIdRef = useRef<string>();

    const theme = useTheme();

    // add this before the React template
    const credential = useMemo(() => {
        try {
            return new AzureCommunicationTokenCredential(widgetAdapterArgs.token);
        } catch {
            console.error('Failed to construct token credential');
            return undefined;
        }
    }, [widgetAdapterArgs.token]);

    const adapterOptions: CommonCallAdapterOptions = useMemo(
        () => ({
          callingSounds: {
            callEnded: { url: '/sounds/callEnded.mp3' },
            callRinging: { url: '/sounds/callRinging.mp3' },
            callBusy: { url: '/sounds/callBusy.mp3' }
          }
        }),
        []
      );

    const callAdapterArgs = useMemo(() => {
        return {
            userId: widgetAdapterArgs.userId,
            credential: credential,
            targetCallees: [widgetAdapterArgs.teamsAppIdentifier] as StartCallIdentifier[],
            displayName: displayName,
            options: adapterOptions
        }
    }, [widgetAdapterArgs.userId, widgetAdapterArgs.teamsAppIdentifier.teamsAppId, credential, displayName]);

    useEffect(() => {
        if (adapter) {
          adapter.on('callEnded', () => {
            setDisplayName(undefined);
            setWidgetState('new');
            setConsentToData(false);
            setAdapter(undefined);
            adapter.dispose();
          });
    
          adapter.on('transferRequested', (e) => {
            e.accept();
          });
    
          adapter.onStateChange((state: CallAdapterState) => {
            if (state?.call?.id && callIdRef.current !== state?.call?.id) {
              callIdRef.current = state?.call?.id;
              console.log(`Call Id: ${callIdRef.current}`);
            }
          });
        }
      }, [adapter]);

    /** widget template for when widget is open, put any fields here for user information desired */
  if (widgetState === 'setup') {
    return (
      <Stack styles={callingWidgetSetupContainerStyles(theme)} tokens={{ childrenGap: '1rem' }}>
        <IconButton
          styles={collapseButtonStyles}
          iconProps={{ iconName: 'Dismiss' }}
          onClick={() => {
            setDisplayName(undefined);
            setConsentToData(false);
            setUseLocalVideo(false);
            setWidgetState('new');
          }}
        />
        <Stack tokens={{ childrenGap: '1rem' }} styles={logoContainerStyles}>
          <Stack style={{ transform: 'scale(1.8)' }}>{onRenderLogo && onRenderLogo()}</Stack>
        </Stack>
        <TextField
          label={'Name'}
          required={true}
          placeholder={'Enter your name'}
          onChange={(_, newValue) => {
            setDisplayName(newValue);
          }}
        />
        <Checkbox
          styles={checkboxStyles(theme)}
          label={'Use video - Checking this box will enable camera controls and screen sharing'}
          onChange={(_, checked?: boolean | undefined) => {
            setUseLocalVideo(!!checked);
            setUseLocalVideo(true);
          }}
        ></Checkbox>
        <Checkbox
          required={true}
          styles={checkboxStyles(theme)}
          disabled={displayName === undefined}
          label={
            'By checking this box, you are consenting that we will collect data from the call for customer support reasons'
          }
          onChange={async (_, checked?: boolean | undefined) => {
            setConsentToData(!!checked);
            if (callAdapterArgs && callAdapterArgs.credential) {
              setAdapter(
                await createAzureCommunicationCallAdapter({
                  displayName: displayName ?? '',
                  userId: callAdapterArgs.userId,
                  credential: callAdapterArgs.credential,
                  targetCallees: callAdapterArgs.targetCallees,
                  options: callAdapterArgs.options
                })
              );
            }
          }}
        ></Checkbox>
        <PrimaryButton
          styles={startCallButtonStyles(theme)}
          onClick={() => {
            if (displayName && consentToData && adapter) {
              setWidgetState('inCall');
              adapter?.startCall(callAdapterArgs.targetCallees, { audioOptions: {muted: false} });
            }
          }}
        >
          {!consentToData && `Enter your name`}
          {consentToData && !adapter && <Spinner ariaLive="assertive" labelPosition="top" />}
          {consentToData && adapter && `StartCall`}
        </PrimaryButton>
      </Stack>
    );
  }

    if (widgetState === 'inCall' && adapter) {
        return (
            <Stack styles={callingWidgetInCallContainerStyles(theme)}>
                <CallComposite
                    adapter={adapter}
                    options={{
                        callControls: {
                            cameraButton: useLocalVideo,
                            screenShareButton: useLocalVideo,
                            moreButton: false,
                            peopleButton: false,
                            displayType: 'compact'
                        },
                        localVideoTile: !useLocalVideo ? false : { position: 'floating' }
                    }} />
            </Stack>
        )
    }

    return (
        <Stack
            horizontalAlign="center"
            verticalAlign="center"
            styles={callingWidgetContainerStyles(theme)}
            onClick={() => {
                setWidgetState('setup');
            }}
        >
            <Stack
                horizontalAlign="center"
                verticalAlign="center"
                style={{ height: '4rem', width: '4rem', borderRadius: '50%', background: theme.palette.themePrimary }}
            >
                <Icon iconName="callAdd" styles={callIconStyles(theme)} />
            </Stack>
        </Stack>
    );

};
